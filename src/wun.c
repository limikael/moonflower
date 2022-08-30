#include "wunrt.h"
#include <gtk/gtk.h>
#include <getopt.h>

#ifndef WUN_DEFAULT_LIBRARY_PATH
#define WUN_DEFAULT_LIBRARY_PATH "/usr/lib/wun"
#endif

void usage() {
	printf(
		"Usage: wun [options] <script.js>\n\n"
		"Options: \n\n"
		"    -l, --library-path=...\n"
		"        Where to look to libraries and default modules.\n\n"
		);
	exit(1);
}

int main(int argc, char* argv[]) {
	gtk_init(&argc, &argv);

	WUNRT *wunrt=wunrt_create();
	wunrt_set_library_path(wunrt,WUN_DEFAULT_LIBRARY_PATH);

	char *short_options="+l:w:h:t:";
	struct option long_options[]={
		{"library-path",1,NULL,'l'},
		{"width",1,NULL,'w'},
		{"height",1,NULL,'h'},
		{"title",1,NULL,'t'},
		{NULL,0,NULL,0}
	};

	int next_option;
	do {
		next_option=getopt_long(argc,argv,short_options,long_options,NULL);
		switch (next_option) {
			case 'l':
				wunrt_set_library_path(wunrt,optarg);
				break;

			case 'w':
				wunrt_set_width(wunrt,atoi(optarg));
				break;

			case 'h':
				wunrt_set_height(wunrt,atoi(optarg));
				break;

			case 't':
				wunrt_set_title(wunrt,optarg);
				break;

			case -1:
				break;

			default:
				usage();
				break;
		}
	} while (next_option!=-1);

	if (argc-optind<1)
		usage();

	char *sargv[argc-optind+2];
	sargv[0]=argv[0];
	for (int i=optind; i<argc; i++)
		sargv[1+i-optind]=argv[i];

	sargv[1+argc-optind]=NULL;
	wunrt_set_argv(wunrt,sargv);

	wunrt_set_uri(wunrt,argv[optind]);
	wunrt_run(wunrt);

	gtk_main();

	return 0;
}
