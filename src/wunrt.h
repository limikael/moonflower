#ifndef __WUNRT_H__
#define __WUNRT_H__

#include <gtk/gtk.h>
#include <webkit2/webkit2.h>

typedef struct {
	GtkWidget *main_window;
	WebKitWebView *web_view;
	char *uri;
	char *library_path;
	int width;
	int height;
	char *title;
	char **argv;
} WUNRT;

WUNRT *wunrt_create();
void wunrt_run(WUNRT *wunrt);
void wunrt_set_uri(WUNRT *wunrt, char *uri);
void wunrt_set_library_path(WUNRT *wunrt, char *path);
void wunrt_set_width(WUNRT *wunrt, int width);
void wunrt_set_height(WUNRT *wunrt, int height);
void wunrt_set_title(WUNRT *wunrt, char *title);
void wunrt_set_argv(WUNRT *wunrt, char **argv);

#endif