import {delay} from "../utils/js-util.js";
import EventEmitter from "events";
import {call} from "wun:subprocess";
import Stream from "wun:stream";
import fs from "wun:fs";
import path from "wun:path";
import Seq from "../utils/Seq.js";

export default class InstallModel extends EventEmitter {
	constructor(appModel) {
		super();

		this.appModel=appModel
		this.state="none";
		this.message="";

		this.packages=[
			"linux-lts","alpine-base","linux-firmware-none","grub","grub-bios","nano",
			"eudev","eudev-openrc","udev-init-scripts","udev-init-scripts-openrc",
			"xorg-server","xfce4","xfce4-terminal","mesa","xf86-input-libinput",
			"virtualbox-guest-additions","openssh","lightdm-gtk-greeter",
			"mesa-dri-gallium","xf86-video-vboxvideo","os-prober"
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

	getPercent=()=>{
		return this.seq.getPercent();
	}

	start=()=>{
		if (this.state!="none")
			throw new Error("Already running");

		this.message="";
		this.seq=new Seq();
		this.seq.on("progress",()=>{
			this.emit("change");
		});

		this.seq.add(this.installStart);
		this.seq.add(this.installFormat);
		this.seq.add(this.installMount);
		this.seq.add(this.installPackages,{size: 5});
		this.seq.add(this.installServices);
		this.seq.add(this.installLocalDebug);
		this.seq.add(this.installBootLoader);
		this.seq.add(this.installUnmount);
		this.seq.add(this.installDone,{size: 0});

		this.state="running";
		this.seq.run()
			.then(()=>{
				this.state="complete";
				this.seq=null;
				this.emit("change");
			})
			.catch((e)=>{
				console.log("Caught error: "+e.message);

				this.state="error";
				this.message=e.message;
				this.seq=null;
				this.emit("change");
			});
	}

	progress=(message="Installing...", percent=null)=>{
		this.message=message;
		if (percent!==null)
			this.seq.notifyPartialProgress(percent);

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

		else {
			console.log("Calling: "+cmd+" "+params.join(" "));
			await call(cmd,params);
		}
	}

	installLocalDebug=async ()=>{
		this.progress("Installing debug services...");

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

	installFormat=async ()=>{
		if (!this.appModel.installDisk)
			throw new Error("No install disk selected");

		if (this.appModel.installMethod=="disk") {
			this.progress("Making partitions on "+this.appModel.installDisk);
			await this.call("/bin/sh",["-c",'printf "1M,1G,,*" | sfdisk '+this.appModel.installDisk]);
			this.appModel.installPart=await this.getFirstPartFromDisk(this.appModel.installDisk);
		}

		this.seq.notifyPartialProgress(50);

		this.progress("Making filesystem on "+this.appModel.installPart);
		await this.call("/sbin/mkfs.ext4",["-F",this.appModel.installPart]);
	}

	installMount=async ()=>{
		this.progress("Mounting filesystems...");
		await this.call("/bin/mount",["-text4",this.appModel.installPart,"/mnt"]);

		for (let chrootMount of this.chrootMounts)
			await this.call("/bin/mkdir",["-p","/mnt/"+chrootMount]);

		for (let chrootMount of this.chrootMounts)
			await this.call("/bin/mount",["--bind","/"+chrootMount,"/mnt/"+chrootMount]);
	}

	installPackages=async ()=>{
		this.progress("Installing packages...");

		let s='#!/bin/sh\n\nPKGSYSTEM_ENABLE_FSYNC=0 /usr/bin/update-mime-database "$@"';
		await this.writeFile("/mnt/usr/sbin/update-mime-database",s,{mode: "755"})

		let [rd,wt]=sys.pipe();
		let rdStream=new Stream(rd,{lines: true});
		rdStream.on("data",(data)=>{
			let [current,total]=data.split("/");
			current=Number(current); total=Number(total);
			let percent=Math.round(100*(current/total));

			if (percent==100)
				this.progress("Configuring packages...",100);

			else
				this.progress("Installing packages... "+percent+"%",percent);
		});

		await this.call("/sbin/apk",[
			"--no-cache",
			"--progress-fd",wt,
			"add","--initdb",
			"--root","/mnt",
			"--repository","/media/cdrom/apks",
			"--keys-dir","/root/moonflower/apkroot/etc/apk/keys",
			...this.packages
		],{
			env: {
				"PKGSYSTEM_ENABLE_FSYNC": 0
			}
		});
	}

	installBootLoader=async ()=>{
		this.progress("Installing bootloader...");
		let t=await this.readFile("/mnt/etc/default/grub");
		t+='GRUB_CMDLINE_LINUX_DEFAULT="modules=ext4 quiet"\n';
		await this.writeFile("/mnt/etc/default/grub",t);

		await this.call("/usr/sbin/chroot",["/mnt/","/usr/sbin/grub-mkconfig","-o","/boot/grub/grub.cfg",this.appModel.installDisk]);
		await this.call("/usr/sbin/chroot",["/mnt/","/usr/sbin/grub-install",this.appModel.installDisk]);
	}

	installServices=async ()=>{
		this.progress("Enabling services...");
		for (let runlevel in this.services) {
			for (let service of this.services[runlevel]) {
				await this.call("/usr/sbin/chroot",["/mnt/","/sbin/rc-update","add",service,runlevel]);
			}
		}
	}

	installUnmount=async ()=>{
		this.progress("Unmounting filesystems...");
		for (let chrootMount of this.chrootMounts)
			await this.call("/bin/umount",["/mnt/"+chrootMount]);

		await this.call("/bin/umount",["/mnt"]);
	}

	installStart=async ()=>{
		this.progress("Installing...");
	}

	installDone=async ()=>{
		this.progress("Done");
		await delay(1000);
	}
}