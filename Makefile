init-keys:
	stat ./.keys/moonflower.rsa > /dev/null
	stat ./.keys/moonflower.rsa.pub > /dev/null

sign-local-repo:
	rm -f ./apks/x86_64/APKINDEX.tar.gz
	apk --root=apkroot index -o apks/x86_64/APKINDEX.tar.gz --rewrite-arch x86_64 apks/x86_64/*.apk
	abuild-sign -k $$(pwd)/.keys/moonflower.rsa ./apks/x86_64/APKINDEX.tar.gz

wun:
	make init-keys
	cp -rT .keys ext/wun/build/.keys
	make -C ext/wun alpine-package
	cp ext/wun/build/out/wun-*.apk apks/x86_64

moonflower-installer:
	make init-keys
	cp -rT .keys ext/moonflower-installer/build/.keys
	cd ext/moonflower-installer && yarn apk
	cp ext/moonflower-installer/build/out/moonflower-installer-*.apk apks/x86_64

moonflower-iso:
	make init-keys
	cp -rT .keys builder/.keys
	docker build -t moonflower-builder builder
	docker run -it -u build -v $$(pwd)/apks:/apks -v $$(pwd)/iso:/iso -e PACKAGER_PRIVKEY=/moonflower.rsa moonflower-builder /home/build/aports/scripts/mkimage.sh --tag latest --outdir /iso --arch x86_64 --repository /apks --hostkeys --profile moonflower

subtree-add:
	git subtree add --prefix=ext/wun wun master --squash
	git subtree add --prefix=ext/moonflower-installer moonflower-installer master --squash

subtree-pull:
	git subtree pull --prefix=ext/wun wun master --squash
	git subtree pull --prefix=ext/moonflower-installer moonflower-installer master --squash

subtree-push:
	git subtree push --prefix=ext/wun wun master
	git subtree push --prefix=ext/moonflower-installer moonflower-installer master