all: bin/wun lib/wunext.so

install:
	mkdir -p /usr/lib/wun
	cp lib/* /usr/lib/wun
	cp bin/wun /usr/bin

bin/wun: $(wildcard src/*.c src/*.h)
	gcc -O3 -o bin/wun src/wun.c src/wunrt.c $$(pkg-config --cflags --libs webkit2gtk-4.0)

lib/wunext.so: $(wildcard src/*.c src/*.h)
	gcc -O3 -shared -o lib/wunext.so -fPIC src/wunext.c $$(pkg-config --cflags --libs webkit2gtk-4.0)

clean:
	rm -f bin/* lib/wunext.so

alpine-package:
	docker build -t wunbuilder build/alpine && docker run -it -v $$(pwd):/src wunbuilder

alpine-package-abuild:
	make clean
	sudo cp /src/build/keys/*.pub /etc/apk/keys
	mkdir -p /src/build/out
	rm -f /src/build/out/*.apk
	rm -f /home/builder/packages/build/x86_64/*
	cd /src/build/alpine && PACKAGER_PRIVKEY=/src/build/keys/li.mikael@gmail.com-62df97f2.rsa abuild
	cp /home/builder/packages/build/x86_64/*.apk /src/build/out
	make clean