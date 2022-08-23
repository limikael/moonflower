wun:
	cp abuild/* ext/wun/build/keys
	make -C ext/wun alpine-package
	cp ext/wun/build/out/wun-*.apk apks/x86_64

subtree:
	#git subtree add --prefix=ext/wun wun master --squash
	#git subtree add --prefix=ext/moonflower-installer moonflower-installer master --squash
	git subtree pull --prefix=ext/wun wun master --squash
	git subtree pull --prefix=ext/moonflower-installer moonflower-installer master --squash
