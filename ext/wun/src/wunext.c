#include <webkit2/webkit-web-extension.h>
#include <gtk/gtk.h>
#include <stdio.h>
#include <fcntl.h>
#include <sys/wait.h>
#include <sys/stat.h>
#include <gio/gunixfdlist.h>
#include "wunext.h"

/*static gboolean wunext_on_signal(GIOChannel *source, GIOCondition cond, gpointer data) {
	WUNEXT *wunext=data;
	int fd=g_io_channel_unix_get_fd(source);
	unsigned char sigdata;
	int sig;

	read(fd,&sigdata,1);
	sig=sigdata;

	JSCValue *sys=jsc_context_get_value(wunext->context,"sys");
	JSCValue *emit=jsc_value_object_get_property(sys,"emit");
	JSCValue *ret=jsc_value_function_call(emit,G_TYPE_INT,sig,G_TYPE_INT,sig,G_TYPE_NONE);

	return TRUE;
}*/

static gboolean wunext_on_watch(GIOChannel *source, GIOCondition cond, gpointer data) {
	WUNEXT *wunext=data;
	int fd=g_io_channel_unix_get_fd(source);
	WUNEXT_WATCH *watch=g_hash_table_lookup(wunext->watch_by_fd,GINT_TO_POINTER(fd));
	if (!watch) {
		printf("warning: wunext_on_watch: Unknown file descriptor.\n");
		return TRUE;
	}

	for (int i=0; i<WUNEXT_WATCH_NCOND; i++) {
		if ((1<<i)&cond) {
			if (watch->cond[i].source && watch->cond[i].cb) {
				JSCValue *cb=watch->cond[i].cb;

				g_source_remove(watch->cond[i].source);
				watch->cond[i].source=0;
				watch->cond[i].cb=NULL;

				JSCValue *ret=jsc_value_function_call(cb,G_TYPE_INT,fd,G_TYPE_INT,1<<i,G_TYPE_NONE);
				g_object_unref(cb);
			}

			else {
				printf("warning: wunext_on_watch: Triggered but no cb.\n");
			}
		}
	}

	return TRUE;
}

static void wunext_add_fildes(WUNEXT *wunext, int fd) {
	WUNEXT_WATCH *watch=g_malloc(sizeof(WUNEXT_WATCH));

	watch->fd=fd;
	watch->channel=g_io_channel_unix_new(watch->fd);

	for (int i=0; i<WUNEXT_WATCH_NCOND; i++) {
		watch->cond[i].cb=NULL;
		watch->cond[i].source=0;
	}

	g_hash_table_insert(wunext->watch_by_fd,GINT_TO_POINTER(fd),watch);
}

static void wunext_remove_fildes(WUNEXT *wunext, int fd) {
	WUNEXT_WATCH *watch=g_hash_table_lookup(wunext->watch_by_fd,GINT_TO_POINTER(fd));
	if (!watch) {
		printf("warning: wunext_remove_fildes: Unknown file descriptor.\n");
		return;
	}

	for (int i=0; i<WUNEXT_WATCH_NCOND; i++) {
		if (watch->cond[i].source)
			g_source_remove(watch->cond[i].source);

		if (watch->cond[i].cb)
			g_object_unref(watch->cond[i].cb);
	}

	g_hash_table_remove(wunext->watch_by_fd,GINT_TO_POINTER(fd));
}

static void wunext_throw(WUNEXT *wunext, char *func) {
	JSCException *ex=jsc_exception_new_printf(wunext->context,
		"%s: %s",func,strerror(errno)
	);

	jsc_context_throw_exception(wunext->context,ex);
}

static int sys_open(char *fn, int flags, WUNEXT *wunext) {
	int fildes=open(fn,flags,0666);
	if (fildes==-1) {
		wunext_throw(wunext,"open");
		return 0;
	}

	wunext_add_fildes(wunext,fildes);

	return fildes;
}

static void sys_close(int fildes, WUNEXT *wunext) {
	wunext_remove_fildes(wunext,fildes);
	if (close(fildes)==-1)
		wunext_throw(wunext,"close");
}

static void sys_watch(int fd, int cond, JSCValue *cb, WUNEXT *wunext) {
	WUNEXT_WATCH *watch=g_hash_table_lookup(wunext->watch_by_fd,GINT_TO_POINTER(fd));
	if (!watch) {
		jsc_context_throw_exception(wunext->context,jsc_exception_new_printf(
			wunext->context,
			"watch: Unknown file descriptor"
		));
		return;
	}

	if (!cond) {
		jsc_context_throw_exception(wunext->context,jsc_exception_new_printf(
			wunext->context,
			"watch: Unknown condition"
		));
		return;
	}

	for (int i=0; i<WUNEXT_WATCH_NCOND; i++) {
		if ((1<<i)&cond) {
			if (watch->cond[i].source) {
				g_source_remove(watch->cond[i].source);
				g_object_unref(watch->cond[i].cb);
			}

			if (cb) {
				watch->cond[i].source=g_io_add_watch(watch->channel,1<<i,wunext_on_watch,wunext);
				watch->cond[i].cb=cb;
				g_object_ref(cb);
			}
		}
	}
}

static JSCValue *sys_readCharCodeArray(int fd, int size, WUNEXT *wunext) {
	unsigned char *data=g_malloc(size);
	int actualsize=read(fd,data,size);

	if (actualsize==-1) {
		wunext_throw(wunext,"read");
		g_free(data);
		return NULL;
	}

	if (actualsize==0) {
		g_free(data);
		return jsc_value_new_null(wunext->context);
	}

	GPtrArray *array=g_ptr_array_sized_new(actualsize);
	for (int i=0; i<actualsize; i++)
		g_ptr_array_add(array,jsc_value_new_number(wunext->context,data[i]));

	JSCValue *v=jsc_value_new_array_from_garray(wunext->context,array);

	g_free(data);
	g_ptr_array_free(array,TRUE);

	return v;
}

static int sys_writeCharCodeArray(int fd, JSCValue *data, WUNEXT *wunext) {
	int len=jsc_value_to_int32(jsc_value_object_get_property(data,"length"));
	unsigned char *buf=g_malloc(len);

	JSCValue *v=jsc_value_object_get_property_at_index(data,0);

	for (int i=0; i<len; i++)
		buf[i]=jsc_value_to_int32(jsc_value_object_get_property_at_index(data,i));

	int res=write(fd,buf,len);
	g_free(buf);

	if (res<0) {
		wunext_throw(wunext,"write");
		return res;
	}

	return res;
}

static void wunext_on_child_exit(GPid pid, int status, gpointer data) {
	WUNEXT *wunext=data;

	JSCValue *sys=jsc_context_get_value(wunext->context,"sys");
	JSCValue *emit=jsc_value_object_get_property(sys,"emit");
	JSCValue *ret=jsc_value_function_call(emit,G_TYPE_STRING,"child",G_TYPE_INT,pid,G_TYPE_INT,status,G_TYPE_NONE);
}

static int sys_fork(WUNEXT *wunext) {
	int res=fork();

	if (res==-1)
		wunext_throw(wunext,"fork");

	if (res!=0) {
		g_child_watch_add(res,wunext_on_child_exit,wunext);
	}

	return res;
}

static void sys_exec(char *cmd, JSCValue *params, WUNEXT *wunext) {
	int len=jsc_value_to_int32(jsc_value_object_get_property(params,"length"));
	char *args[len+2];

	args[0]=cmd;

	for (int i=0; i<len; i++)
		args[i+1]=jsc_value_to_string(jsc_value_object_get_property_at_index(params,i));

	args[len+1]=NULL;

	int res=execv(cmd,args);
	if (res==-1)
		wunext_throw(wunext,"exec");
}

static JSCValue *sys_pipe(WUNEXT *wunext) {
	int pipes[2];
	int res=pipe(pipes);

	if (res==-1) {
		wunext_throw(wunext,"pipe");
		return NULL;
	}

	wunext_add_fildes(wunext,pipes[0]);
	wunext_add_fildes(wunext,pipes[1]);

	return jsc_value_new_array(wunext->context,G_TYPE_INT,pipes[0],G_TYPE_INT,pipes[1],G_TYPE_NONE);
}

static void sys_dup2(int a, int b, WUNEXT *wunext) {
	int res=dup2(a,b);

	if (res==-1)
		wunext_throw(wunext,"dup2");
}

/*static JSCValue *sys_waitpid(int pid, int flags, WUNEXT *wunext) {
	if (pid<=0) {
		jsc_context_throw_exception(wunext->context,jsc_exception_new_printf(
			wunext->context,
			"waitpid: need pid"
		));
		return NULL;
	}

	int status;
	int res=waitpid(pid,&status,flags);

	if (res==-1) {
		printf("waidpiderror: %d\n",errno);
		wunext_throw(wunext,"waitpid");
		return NULL;
	}

	if (res==0)
		return jsc_value_new_undefined(wunext->context);

	return jsc_value_new_number(wunext->context,WEXITSTATUS(status));
}*/

static void console_log(char *s) {
	printf("%s\n",s);
}

static void sys_exit(int code, WUNEXT *wunext) {
	GVariant *variant=g_variant_new("(i)",code);
	WebKitUserMessage *message=webkit_user_message_new("exit",variant);
	webkit_web_extension_send_message_to_context(wunext->extension,message,NULL,NULL,NULL);
}

static void sys__exit(int code, WUNEXT *wunext) {
	_exit(code);
}

static void window_resizeTo(int w, int h, WUNEXT *wunext) {
	GVariant *variant=g_variant_new("(ii)",w,h);
	WebKitUserMessage *message=webkit_user_message_new("resize",variant);
	webkit_web_extension_send_message_to_context(wunext->extension,message,NULL,NULL,NULL);
}

static void sys_show(WUNEXT *wunext) {
	WebKitUserMessage *message=webkit_user_message_new("show",NULL);
	webkit_web_extension_send_message_to_context(wunext->extension,message,NULL,NULL,NULL);
}

static char *window_get_title(WUNEXT *wunext) {
	return g_strdup("no title for you");
}

static void window_set_title(char *title, WUNEXT *wunext) {
	GVariant *variant=g_variant_new("(s)",title);
	WebKitUserMessage *message=webkit_user_message_new("title",variant);
	webkit_web_extension_send_message_to_context(wunext->extension,message,NULL,NULL,NULL);
}

char *sys_event_emitter_code=
"sys.__listeners={};"
"sys.emit=(event, ...args)=>{"
"  if (!sys.__listeners[event]) return;"
"  for (let fn of [...sys.__listeners[event]]) fn(...args);"
"}; "
"sys.on=(event, fn)=>{"
"  if (!sys.__listeners[event]) sys.__listeners[event]=[];"
"  sys.__listeners[event].push(fn);"
"}; "
"sys.off=(event, fn)=>{"
"  if (!sys.__listeners[event]) return;"
"  let index=sys.__listeners[event].indexOf(fn);"
"  for (; index>=0; index=sys.__listeners[event].indexOf(fn)) sys.__listeners[event].splice(index,1);"
"  if (!sys.__listeners[event].length) delete sys.__listeners[event];"
"}; ";

static void 
window_object_cleared_callback (WebKitScriptWorld *world, 
								WebKitWebPage     *web_page, 
								WebKitFrame       *frame, 
								gpointer           data)
{
	WUNEXT *wunext=data;

	JSCContext *context=webkit_frame_get_js_context_for_script_world(frame,world);
	wunext->context=context;

	JSCValue *sys=jsc_value_new_object(context,NULL,NULL);
	jsc_context_set_value(context,"sys",sys);

	JSCValue *r=jsc_context_evaluate(context,sys_event_emitter_code,-1);

	jsc_value_object_set_property(sys,"O_NONBLOCK",jsc_value_new_number(context,O_NONBLOCK));
	jsc_value_object_set_property(sys,"O_RDONLY",jsc_value_new_number(context,O_RDONLY));
	jsc_value_object_set_property(sys,"O_WRONLY",jsc_value_new_number(context,O_WRONLY));
	jsc_value_object_set_property(sys,"O_RDWR",jsc_value_new_number(context,O_RDWR));
	jsc_value_object_set_property(sys,"O_CREAT",jsc_value_new_number(context,O_CREAT));
	jsc_value_object_set_property(sys,"O_TRUNC",jsc_value_new_number(context,O_TRUNC));

	jsc_value_object_set_property(sys,"G_IO_IN",jsc_value_new_number(context,G_IO_IN));
	jsc_value_object_set_property(sys,"G_IO_OUT",jsc_value_new_number(context,G_IO_OUT));
	jsc_value_object_set_property(sys,"G_IO_PRI",jsc_value_new_number(context,G_IO_PRI));
	jsc_value_object_set_property(sys,"G_IO_ERR",jsc_value_new_number(context,G_IO_ERR));
	jsc_value_object_set_property(sys,"G_IO_HUP",jsc_value_new_number(context,G_IO_HUP));
	jsc_value_object_set_property(sys,"G_IO_NVAL",jsc_value_new_number(context,G_IO_NVAL));

	jsc_value_object_set_property(sys,"STDIN_FILENO",jsc_value_new_number(context,STDIN_FILENO));
	jsc_value_object_set_property(sys,"STDOUT_FILENO",jsc_value_new_number(context,STDOUT_FILENO));
	jsc_value_object_set_property(sys,"STDERR_FILENO",jsc_value_new_number(context,STDERR_FILENO));

	jsc_value_object_set_property(sys,"SIGCHLD",jsc_value_new_number(context,SIGCHLD));
	jsc_value_object_set_property(sys,"WNOHANG",jsc_value_new_number(context,WNOHANG));

	jsc_value_object_set_property(sys,"open",
		jsc_value_new_function(context,"open",G_CALLBACK(sys_open),wunext,NULL,G_TYPE_INT,2,G_TYPE_STRING,G_TYPE_INT)
	);

	jsc_value_object_set_property(sys,"close",
		jsc_value_new_function(context,"close",G_CALLBACK(sys_close),wunext,NULL,G_TYPE_NONE,1,G_TYPE_INT)
	);

	jsc_value_object_set_property(sys,"watch",
		jsc_value_new_function(context,"watch",G_CALLBACK(sys_watch),wunext,NULL,G_TYPE_NONE,3,G_TYPE_INT,G_TYPE_INT,JSC_TYPE_VALUE)
	);

	jsc_value_object_set_property(sys,"readCharCodeArray",
		jsc_value_new_function(context,"readCharCodeArray",G_CALLBACK(sys_readCharCodeArray),wunext,NULL,JSC_TYPE_VALUE,2,G_TYPE_INT,G_TYPE_INT)
	);

	jsc_value_object_set_property(sys,"writeCharCodeArray",
		jsc_value_new_function(context,"writeCharCodeArray",G_CALLBACK(sys_writeCharCodeArray),wunext,NULL,G_TYPE_INT,2,G_TYPE_INT,JSC_TYPE_VALUE)
	);

	jsc_value_object_set_property(sys,"fork",
		jsc_value_new_function(context,"fork",G_CALLBACK(sys_fork),wunext,NULL,G_TYPE_INT,0)
	);

	jsc_value_object_set_property(sys,"exec",
		jsc_value_new_function(context,"exec",G_CALLBACK(sys_exec),wunext,NULL,G_TYPE_NONE,2,G_TYPE_STRING,JSC_TYPE_VALUE)
	);

	jsc_value_object_set_property(sys,"pipe",
		jsc_value_new_function(context,"pipe",G_CALLBACK(sys_pipe),wunext,NULL,JSC_TYPE_VALUE,0)
	);

	jsc_value_object_set_property(sys,"dup2",
		jsc_value_new_function(context,"dup2",G_CALLBACK(sys_dup2),wunext,NULL,G_TYPE_NONE,2,G_TYPE_INT,G_TYPE_INT)
	);

	/*jsc_value_object_set_property(sys,"waitpid",
		jsc_value_new_function(context,"waitpid",G_CALLBACK(sys_waitpid),wunext,NULL,JSC_TYPE_VALUE,2,G_TYPE_INT,G_TYPE_INT)
	);*/

	jsc_value_object_set_property(sys,"exit",
		jsc_value_new_function(context,"exit",G_CALLBACK(sys_exit),wunext,NULL,G_TYPE_NONE,1,G_TYPE_INT)
	);

	jsc_value_object_set_property(sys,"_exit",
		jsc_value_new_function(context,"_exit",G_CALLBACK(sys__exit),wunext,NULL,G_TYPE_NONE,1,G_TYPE_INT)
	);

	jsc_value_object_set_property(sys,"show",
		jsc_value_new_function(context,"show",G_CALLBACK(sys_show),wunext,NULL,G_TYPE_NONE,0)
	);

	JSCValue *console=jsc_value_new_object(context,NULL,NULL);
	jsc_context_set_value(context,"console",console);

	jsc_value_object_set_property(console,"log",
		jsc_value_new_function(context,"log",G_CALLBACK(console_log),wunext,NULL,G_TYPE_NONE,1,G_TYPE_STRING)
	);

	JSCValue *window=jsc_context_get_value(context,"window");

	jsc_value_object_set_property(window,"resizeTo",
		jsc_value_new_function(context,"resizeTo",G_CALLBACK(window_resizeTo),wunext,NULL,G_TYPE_NONE,2,G_TYPE_INT,G_TYPE_INT)
	);

	jsc_value_object_define_property_accessor(window,"title",
		JSC_VALUE_PROPERTY_ENUMERABLE|JSC_VALUE_PROPERTY_WRITABLE,
		G_TYPE_STRING,G_CALLBACK(window_get_title),G_CALLBACK(window_set_title),wunext,NULL);

	JSCValue *document=jsc_context_get_value(context,"document");

	jsc_value_object_define_property_accessor(document,"title",
		JSC_VALUE_PROPERTY_ENUMERABLE|JSC_VALUE_PROPERTY_WRITABLE,
		G_TYPE_STRING,G_CALLBACK(window_get_title),G_CALLBACK(window_set_title),wunext,NULL);
}

G_MODULE_EXPORT void webkit_web_extension_initialize(WebKitWebExtension *extension) {
	WUNEXT *wunext=g_malloc(sizeof(WUNEXT));
	wunext->extension=extension;
	wunext->watch_by_fd=g_hash_table_new(g_direct_hash,g_direct_equal);

	g_signal_connect(
		webkit_script_world_get_default(),
		"window-object-cleared",
		G_CALLBACK(window_object_cleared_callback),
		wunext
	);
}