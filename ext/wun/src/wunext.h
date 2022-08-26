#ifndef __WUNEXT_H__
#define __WUNEXT_H__

#include <gtk/gtk.h>
#include <webkit2/webkit-web-extension.h>

#define WUNEXT_WATCH_NCOND 6

typedef struct {
	int fd;
	GIOChannel *channel;
	struct {
		JSCValue *cb;
		int source;
	} cond[WUNEXT_WATCH_NCOND];
} WUNEXT_WATCH;

typedef struct {
	WebKitWebExtension *extension;
	JSCContext *context;
	GHashTable *watch_by_fd;
} WUNEXT;

#endif