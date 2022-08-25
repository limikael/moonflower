wun:
	cp abuild/* ext/wun/build/keys
	make -C ext/wun alpine-package
	cp ext/wun/build/out/wun-*.apk apks/x86_64

subtree-add:
	git subtree add --prefix=ext/wun wun master --squash
	git subtree add --prefix=ext/moonflower-installer moonflower-installer master --squash

subtree-pull:
	git subtree pull --prefix=ext/wun wun master --squash
	git subtree pull --prefix=ext/moonflower-installer moonflower-installer master --squash

subtree-push:
	git subtree push --prefix=ext/wun wun master
	git subtree push --prefix=ext/moonflower-installer moonflower-installer master