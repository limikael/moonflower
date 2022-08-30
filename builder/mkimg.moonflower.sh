#!/bin/sh
profile_moonflower() {
	profile_standard
	apks="$apks nano"

	# For X
	apks="$apks xorg-server xf86-input-libinput eudev eudev-openrc mesa"
	apks="$apks dbus dbus-openrc xfce4 xfce4-terminal"

	# For installer
	apks="$apks openssh grub-bios grub virtualbox-guest-additions"
	apks="$apks udev-init-scripts udev-init-scripts-openrc"
	apks="$apks lsblk pv sfdisk wun"

	apks="$apks e2fsprogs e2fsprogs-extra"

	# For installed system
	apks="$apks linux-lts alpine-base linux-firmware-none"
	apks="$apks mesa-dri-gallium xf86-video-vboxvideo"

	apkovl="genapkovl-moonflower.sh"
}
