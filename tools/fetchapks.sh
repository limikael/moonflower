#!/usr/bin/env bash
fakeroot apk \
	--allow-untrusted \
	--root tools/apkroot \
	--initdb \
	--repository https://dl-cdn.alpinelinux.org/alpine/edge/main/ \
	add xkeyboard-config kbd-bkeymaps tzdata