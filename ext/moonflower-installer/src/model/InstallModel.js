import {delay} from "../utils/js-util.js";
import EventEmitter from "events";
import {call} from "wun:subprocess";
import Stream from "wun:stream";
import fs from "wun:fs";
import path from "wun:path";

export default class InstallModel extends EventEmitter {
	constructor(appModel) {
		super();

		this.appModel=appModel

		this.runPromise=null;
		this.percent=0;
		this.message="";
		this.state="none";

		this.packages=[
			"linux-lts","alpine-base","linux-firmware-none","grub","grub-bios","nano",
			"eudev","eudev-openrc","udev-init-scripts","udev-init-scripts-openrc",
			"xorg-server","xfce4","xfce4-terminal","mesa","xf86-input-libinput",
			"virtualbox-guest-additions","openssh","lightdm-gtk-greeter",
			"mesa-dri-gallium","xf86-video-vboxvideo"
		];

		this.chrootMounts=["dev","proc","sys"];

		this.services={
			"sysinit": ["devfs","dmesg","udev","udev-settle","udev-trigger","hwdrivers","modloop"],
			"boot": ["hwclock","modules","sysctl","hostname","bootmisc","syslog"],
			"shutdown": ["mount-ro","killprocs","savecache"],
			"default": ["udev-postmount","dbus","virtualbox-guest-additions","local","lightdm"]
		}

		this.mock=sys.argv.includes("--mock");
	}

	start=()=>{
		if (this.state!="none")
			throw new Error("Already running");

		console.log("Starting install, mock="+this.mock);

		this.state="running";
		this.percent=0;
		this.message="";

		this.emit("change");

		this.runPromise=this.run();
		this.runPromise.then(()=>{
			this.state="complete";
			this.emit("change");
		}).catch((e)=>{
			console.log("caught..");
			console.log("caught error: "+e.message);

			this.state="error";
			this.message=e.message;
			this.emit("change");
		});
	}

	progress=(percent, message="Installing...")=>{
		this.percent=percent;
		this.message=message;
		this.emit("change");
	}

	async getFirstPartFromDisk(disk) {
		let data=JSON.parse(await call("/bin/lsblk",["-JT","-opath,type",disk]));

		let part;
		for (let diskData of data.blockdevices) {
			if (diskData.path==disk)
				part=diskData.children[0].path
		}

		if (!part)
			throw new Error("No partition found on disk");

		console.log("part: "+part);
		return part;
	}

	readFile=async (fn)=>{
		if (this.mock) {
			console.log("Reading: "+fn);
			await delay(100);
			return "";
		}

		return fs.readFileSync(fn);
	}

	writeFile=async (fn, content, options={})=>{
		await this.call("/bin/mkdir",["-p",path.dirname(fn)]);

		if (this.mock) {
			console.log("Writing: "+fn);
			await delay(100);
		}

		else
			fs.writeFileSync(fn,content);

		if (options.mode)
			await this.call("/bin/chmod",[options.mode,fn]);
	}

	call=async (cmd, params)=>{
		if (this.mock) {
			console.log("Calling: "+cmd+" "+params.join(" "));
			await delay(100);
		}

		else
			await call(cmd,params);
	}

	installLocalDebug=async ()=>{
		let script=`
			echo "Starting debug stuff..."

			ifconfig eth0 up
			udhcpc eth0

			echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
			rc-service sshd restart

			mkdir -p /root/.ssh
			echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDH1/VRIVLxf0DZhSw+oktqqRBzhP9FayFRU8q+jFSozZez/MeqfgGNBCurbkJitoBf/BJm24XJgNw1gIXDzaxBR8dA6vspjF0rzoOGPKd4Y9CcVM+7r0R0LHLF9gtJIbzRXKjyXGPUnSwDPT1NSNf4ufyKlrSlyuDLBSD7mn/yGEGamKK8QwbZnAXuqUN399Ym21zhzaSiWhW2BF2poZ0yiVMaU3ioeCQ8xgPCrjejNYL8VTNm3kUbmOpaDeb/zRwkwcUgrfPbGsGNyC6+j0Pn1fCg8aaFQviHmIgZDxnR3vhvgOJxNgpeA2mbFlfoqfj3QptT2g636Ew2yn2/Uda3t7DB0zcgZCjDy6attzbLfAtp/lHQEAcL3wNwEMniw0I+Mbf5NKC6Dj8QS2kJTHwl0dqssNiRc3CvaK7nfDzTrk0q6T7DRUAPy9Q9vrXEkRztP1px9vGto+fGZCMVzJwoj+dRTBmwy44T4GD05d1BwUMybq4I0fDSJMO36Z+TKis= micke@micke-x455ya" > /root/.ssh/authorized_keys

			mkdir -p /root/moonflower
			mount.vboxsf moonflower /root/moonflower
		`;

		await this.writeFile("/mnt/etc/local.d/main.start",script,{mode: "755"});
	}

	run=async ()=>{
		await delay(0);
		if (this.appModel.installMethod!="disk")
			throw new Error("Only disk install supported");

		if (!this.appModel.installDisk)
			throw new Error("No install disk selected");

		this.progress(10,"Making partitions on "+this.appModel.installDisk);
		await this.call("/bin/sh",["-c",'printf "1M,1G,,*" | sfdisk '+this.appModel.installDisk]);

		this.appModel.installPart=await this.getFirstPartFromDisk(this.appModel.installDisk);
		this.progress(15,"Making filesystem on "+this.appModel.installPart);
		await this.call("/sbin/mkfs.ext4",["-F",this.appModel.installPart]);

		this.progress(20,"Mounting filesystems...");
		await this.call("/bin/mount",["-text4","/dev/sda1","/mnt"]);

		for (let chrootMount of this.chrootMounts)
			await this.call("/bin/mkdir",["-p","/mnt/"+chrootMount]);

		for (let chrootMount of this.chrootMounts)
			await this.call("/bin/mount",["--bind","/"+chrootMount,"/mnt/"+chrootMount]);

		this.progress(30,"Installing packages...");

		let s='#!/bin/sh\n\nPKGSYSTEM_ENABLE_FSYNC=0 /usr/bin/update-mime-database "$@"';
		await this.writeFile("/mnt/usr/sbin/update-mime-database",s,{mode: "755"})

		let [rd,wt]=sys.pipe();
		let rdStream=new Stream(rd,{lines: true});
		rdStream.on("data",(data)=>{
			let [current,total]=data.split("/");
			current=Number(current); total=Number(total);
			let percent=Math.round(100*(current/total));
			if (percent==100) {
				this.progress(70,"Configuring packages...");
			}

			else {
				let installPercent=30+(70-30)*percent/100;
				this.progress(installPercent,"Installing packages... "+percent+"%");
			}
		});
		await this.call("/sbin/apk",[
			"--no-cache",
			"--progress-fd",wt,
			"add","--initdb",
			"--root","/mnt",
			"--repository","/root/moonflower/apks",
			"--keys-dir","/root/moonflower/apkroot/etc/apk/keys",
			...this.packages
		],{
			env: {
				"PKGSYSTEM_ENABLE_FSYNC": 0
			}
		});

		await this.installLocalDebug();

		this.progress(80,"Enabling services...");
		for (let runlevel in this.services) {
			for (let service of this.services[runlevel]) {
				await this.call("/usr/sbin/chroot",["/mnt/","/sbin/rc-update","add",service,runlevel]);
			}
		}

		this.progress(90,"Installing bootloader...");
		let t=await this.readFile("/mnt/etc/default/grub");
		t+='GRUB_CMDLINE_LINUX_DEFAULT="modules=ext4 quiet"\n';
		await this.writeFile("/mnt/etc/default/grub",t);

		await this.call("/usr/sbin/chroot",["/mnt/","/usr/sbin/grub-mkconfig","-o","/boot/grub/grub.cfg",this.appModel.installDisk]);
		await this.call("/usr/sbin/chroot",["/mnt/","/usr/sbin/grub-install",this.appModel.installDisk]);

		this.progress(95,"Unmounting filesystems...");
		for (let chrootMount of this.chrootMounts)
			await this.call("/bin/umount",["/mnt/"+chrootMount]);

		await this.call("/bin/umount",["/mnt"]);

		this.progress(100,"Done");
		await delay(1000);
	}
}