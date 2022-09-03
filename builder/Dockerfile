FROM alpine:latest

RUN echo "https://dl-cdn.alpinelinux.org/alpine/latest-stable/community" | tee -a /etc/apk/repositories
RUN apk update
RUN apk add alpine-sdk build-base apk-tools alpine-conf busybox \
	fakeroot syslinux xorriso mtools dosfstools grub-efi make \
	git squashfs-tools sudo

RUN adduser -h /home/build -D build -G abuild
RUN echo 'build ALL=(ALL) NOPASSWD: ALL' | tee -a /etc/sudoers

RUN git clone --depth=1 https://gitlab.alpinelinux.org/alpine/aports.git /home/build/aports
RUN cd /home/build/aports && apk update

COPY .keys/moonflower.rsa.pub /etc/apk/keys
COPY --chown=build:abuild .keys/moonflower.rsa /
COPY *.sh /home/build/aports/scripts/
