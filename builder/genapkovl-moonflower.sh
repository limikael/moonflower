#!/bin/sh -e

HOSTNAME="$1"
if [ -z "$HOSTNAME" ]; then
	echo "usage: $0 hostname"
	exit 1
fi

cleanup() {
	rm -rf "$tmp"
}

makefile() {
	OWNER="$1"
	PERMS="$2"
	FILENAME="$3"
	cat > "$FILENAME"
	chown "$OWNER" "$FILENAME"
	chmod "$PERMS" "$FILENAME"
}

rc_add() {
	mkdir -p "$tmp"/etc/runlevels/"$2"
	ln -sf /etc/init.d/"$1" "$tmp"/etc/runlevels/"$2"/"$1"
}

tmp="$(mktemp -d)"
trap cleanup EXIT

mkdir -p "$tmp"/etc/local.d
makefile root:root 0755 "$tmp"/etc/local.d/live.start <<EOF
if grep -q hypervisor /proc/cpuinfo && VBoxControl sharedfolder list | grep -q moonflower; then 
	echo "Starting debug stuff..."

	ifconfig eth0 up
	udhcpc eth0

	echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
	rc-service sshd restart

	mkdir -p /root/.ssh
	echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDH1/VRIVLxf0DZhSw+oktqqRBzhP9FayFRU8q+jFSozZez/MeqfgGNBCurbkJitoBf/BJm24XJgNw1gIXDzaxBR8dA6vspjF0rzoOGPKd4Y9CcVM+7r0R0LHLF9gtJIbzRXKjyXGPUnSwDPT1NSNf4ufyKlrSlyuDLBSD7mn/yGEGamKK8QwbZnAXuqUN399Ym21zhzaSiWhW2BF2poZ0yiVMaU3ioeCQ8xgPCrjejNYL8VTNm3kUbmOpaDeb/zRwkwcUgrfPbGsGNyC6+j0Pn1fCg8aaFQviHmIgZDxnR3vhvgOJxNgpeA2mbFlfoqfj3QptT2g636Ew2yn2/Uda3t7DB0zcgZCjDy6attzbLfAtp/lHQEAcL3wNwEMniw0I+Mbf5NKC6Dj8QS2kJTHwl0dqssNiRc3CvaK7nfDzTrk0q6T7DRUAPy9Q9vrXEkRztP1px9vGto+fGZCMVzJwoj+dRTBmwy44T4GD05d1BwUMybq4I0fDSJMO36Z+TKis= micke@micke-x455ya" > /root/.ssh/authorized_keys

	mkdir -p /root/moonflower
	mount.vboxsf moonflower /root/moonflower
fi

echo "Setting up live environment..."
startx&
EOF

mkdir -p "$tmp"/etc/apk
makefile root:root 0644 "$tmp"/etc/apk/world <<EOF
alpine-base
openssh
eudev
eudev-openrc
udev-init-scripts
udev-init-scripts-openrc
xorg-server
xfce4
xfce4-terminal
mesa
xf86-input-libinput
virtualbox-guest-additions
grub-bios
grub
e2fsprogs
e2fsprogs-extra
nano
lsblk
pv
sfdisk
wun
mesa-dri-gallium
xf86-video-vboxvideo
EOF

rc_add devfs sysinit
rc_add dmesg sysinit
rc_add udev sysinit
rc_add udev-settle sysinit
rc_add udev-trigger sysinit
rc_add hwdrivers sysinit
rc_add modloop sysinit

rc_add hwclock boot
rc_add modules boot
rc_add sysctl boot
rc_add hostname boot
rc_add bootmisc boot
rc_add syslog boot

rc_add mount-ro shutdown
rc_add killprocs shutdown
rc_add savecache shutdown

rc_add local default
rc_add udev-postmount default
rc_add dbus default
rc_add virtualbox-guest-additions default

tar -c -C "$tmp" etc | gzip -9n > $HOSTNAME.apkovl.tar.gz
