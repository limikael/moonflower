#include "wunrt.h"
#include <stdio.h>
#include <gtk/gtk.h>
#include <webkit2/webkit2.h>
#include <fcntl.h>
#include <gio/gunixinputstream.h>

WUNRT *wunrt_create() {
	WUNRT *wunrt=g_malloc(sizeof(WUNRT));

	wunrt->library_path=NULL;
	wunrt->web_view=NULL;
	wunrt->main_window=NULL;
	wunrt->width=800;
	wunrt->height=600;
	wunrt->title=NULL;

	return wunrt;
}

static void wunrt_on_window_close(GtkWidget* widget, WUNRT *wunrt) {
	gtk_main_quit();
}

static gboolean wunrt_on_load_failed (WebKitWebView  *web_view,
               WebKitLoadEvent load_event,
               char           *failing_uri,
               GError         *error,
               gpointer        user_data) {
	printf("load error\n");
}

/*static gboolean wunrt_on_load_changed(
		WebKitWebView *web_view,
		WebKitLoadEvent load_event,
		gpointer data) {
	WUNRT *wunrt=data;
	//printf("load change: %d\n",load_event);

	switch (load_event) {
		case WEBKIT_LOAD_FINISHED:
			gtk_widget_show_all(wunrt->main_window);

			break;
	}
}*/

static void wunrt_on_wun_request(WebKitURISchemeRequest *request, gpointer data) {
	WUNRT *wunrt=data;
	
	const gchar *request_path=webkit_uri_scheme_request_get_path(request);
	char *full_path=g_strdup_printf("%s/%s.js",wunrt->library_path,request_path);

	//printf("trying: %s\n",full_path);

	int fildes=open(full_path,O_RDONLY);
	if (fildes==-1) {
		perror(g_strdup_printf("Importing module: %s",request_path));
		exit(1);
	}

	g_free(full_path);
	GInputStream *stream=g_unix_input_stream_new(fildes,true);

	webkit_uri_scheme_request_finish(request,stream,-1,"application/javascript");
	g_object_unref(stream);
}

static void wunrt_on_filejs_request(WebKitURISchemeRequest *request, gpointer data) {
	WUNRT *wunrt=data;
	const gchar *request_path=webkit_uri_scheme_request_get_path(request);

	/*printf("jsreq: %s\n",request_path);
	exit(1);*/

	int fildes=open(request_path,O_RDONLY);
	if (fildes==-1) {
		perror(g_strdup_printf("Error loading: %s",request_path));
		exit(1);
	}

	GInputStream *stream=g_unix_input_stream_new(fildes,true);

	webkit_uri_scheme_request_finish(request,stream,-1,"application/javascript");
	g_object_unref(stream);
}

static gboolean wunrt_on_message(WebKitWebContext *context, WebKitUserMessage *message, gpointer data) {
	WUNRT *wunrt=data;
	const char *name=webkit_user_message_get_name(message);
	GVariant *variant=webkit_user_message_get_parameters(message);

	//printf("msg: %s\n",name);

	if (!strcmp(name,"resize")) {
		int w,h;
		g_variant_get(variant,"(ii)",&w,&h);
		gtk_window_resize((GtkWindow *)wunrt->main_window,w,h);
	}

	if (!strcmp(name,"exit")) {
		int code;
		g_variant_get(variant,"(i)",&code);
		exit(code);
	}

	if (!strcmp(name,"show")) {
		gtk_widget_show_all(wunrt->main_window);
	}

	if (!strcmp(name,"title")) {
		char *s;
		g_variant_get(variant,"(s)",&s);
		gtk_window_set_title((GtkWindow *)wunrt->main_window,s);
	}
}

// use resource-load-started?
void wunrt_create_window(WUNRT *wunrt) {
	wunrt->main_window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
	//gtk_widget_set_app_paintable(wunrt->main_window, TRUE);
	gtk_window_set_default_size(GTK_WINDOW(wunrt->main_window),wunrt->width,wunrt->height);

	if (wunrt->title)
		gtk_window_set_title(GTK_WINDOW(wunrt->main_window),wunrt->title);

	wunrt->web_view = WEBKIT_WEB_VIEW(webkit_web_view_new());
	gtk_container_add(GTK_CONTAINER(wunrt->main_window), GTK_WIDGET(wunrt->web_view));

	g_signal_connect(wunrt->main_window, "destroy", G_CALLBACK(wunrt_on_window_close),wunrt);
	g_signal_connect(wunrt->web_view,"load-failed",G_CALLBACK(wunrt_on_load_failed),wunrt);
	//g_signal_connect(wunrt->web_view,"load-changed",G_CALLBACK(wunrt_on_load_changed),wunrt);

	WebKitSettings *settings=webkit_web_view_get_settings(wunrt->web_view);
	webkit_settings_set_enable_write_console_messages_to_stdout(settings,TRUE);
	webkit_settings_set_allow_file_access_from_file_urls(settings,TRUE);
	webkit_settings_set_allow_universal_access_from_file_urls(settings,TRUE);

	WebKitWebContext *context=webkit_web_view_get_context(wunrt->web_view);
	webkit_web_context_register_uri_scheme(context,"wun",wunrt_on_wun_request,wunrt,NULL);
	webkit_web_context_register_uri_scheme(context,"filejs",wunrt_on_filejs_request,wunrt,NULL);
	webkit_web_context_set_web_extensions_directory(context,wunrt->library_path);

	g_signal_connect(context,"user-message-received",G_CALLBACK(wunrt_on_message),wunrt);
}

void wunrt_set_library_path(WUNRT *wunrt, char *path) {
	wunrt->library_path=path;
}

void wunrt_set_uri(WUNRT *wunrt, char *uri) {
	wunrt->uri=uri;
}

void wunrt_set_width(WUNRT *wunrt, int width) {
	wunrt->width=width;
}

void wunrt_set_height(WUNRT *wunrt, int height) {
	wunrt->height=height;
}

void wunrt_set_title(WUNRT *wunrt, char *title) {
	wunrt->title=title;
}

void wunrt_load_url(WUNRT *wunrt) {
	char *content=
		"<html>"
		"<body onload=\"sys.show()\"></body>"
		"<script src=\"%s\" type=\"module\"></script>"
		"</html>";

	char *sourceuri=g_strdup_printf("filejs:%s",wunrt->uri);
	char *html=g_strdup_printf(content,sourceuri);

	webkit_web_view_load_html(wunrt->web_view,html,"file:///");

	g_free(html);
	g_free(sourceuri);
}

void wunrt_run(WUNRT *wunrt) {
	if (!wunrt->library_path) {
		printf("Library path not set...\n");
		exit(1);
	}

	char *extfn=g_strdup_printf("%s/%s",wunrt->library_path,"wunext.so");
	if (!g_file_test(extfn,G_FILE_TEST_EXISTS)) {
		printf("wunext.so not found at %s\n",extfn);
		exit(1);
	}

	g_free(extfn);

	wunrt_create_window(wunrt);
	wunrt_load_url(wunrt);

	gtk_widget_grab_focus(GTK_WIDGET(wunrt->web_view));
	//gtk_widget_show_all(wunrt->main_window);
}