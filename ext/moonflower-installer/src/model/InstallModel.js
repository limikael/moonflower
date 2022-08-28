import {delay} from "../utils/js-util.js";
import EventEmitter from "events";
import {call} from "wun:subprocess";
import Stream from "wun:stream";

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
			"virtualbox-guest-additions","openssh"
		];

		/*this.packages=[
			"acct"
		];*/

		this.chrootMounts=["dev","proc","sys"];
	}

	start=()=>{
		if (this.state!="none")
			throw new Error("Already running");

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
		let part;
		//console.log("calling lsblk");
		let out=await call("/bin/lsblk",["-JT","-opath,type",disk]);
		//console.log("got: "+out);
		let data=JSON.parse(out);
		//console.log("got data from lsblk");

		for (let diskData of data.blockdevices) {
			if (diskData.path==disk)
				part=diskData.children[0].path
		}

		if (!part)
			throw new Error("No partition found on disk");

		console.log("part: "+part);
		return part;
	}

	run=async ()=>{
		await delay(0);
		/*if (this.appModel.installMethod!="disk")
			throw new Error("Only disk install supported");

		if (!this.appModel.installDisk)
			throw new Error("No install disk selected");*/

		this.progress(10,"Making partitions on "+this.appModel.installDisk);
		await call("/bin/sh",["-c",'printf "1M,1G,,*" | sfdisk '+this.appModel.installDisk]);
		this.progress(10,"Partitioning done...");

		this.appModel.installPart=await this.getFirstPartFromDisk(this.appModel.installDisk);
		this.progress(20,"Making filesystem on "+this.appModel.installPart);
		await call("/sbin/mkfs.ext4",["-F",this.appModel.installPart]);

		this.progress(30,"Mounting filesystems...");
		await call("/bin/mount",["-text4","/dev/sda1","/mnt"]);

		for (let chrootMount of this.chrootMounts)
			await call("/bin/mkdir",["-p","/mnt/"+chrootMount]);

		for (let chrootMount of this.chrootMounts)
			await call("/bin/mount",["--bind","/"+chrootMount,"/mnt/"+chrootMount]);

		this.progress(40,"Installing packages...");
		let [rd,wt]=sys.pipe();
		let rdStream=new Stream(rd,{lines: true});
		rdStream.on("data",(data)=>{
			let [current,total]=data.split("/");
			current=Number(current); total=Number(total);
			let percent=Math.round(100*(current/total));
			if (percent==100) {
				this.progress(80,"Configuring packages...");
			}

			else {
				let installPercent=40+(80-40)*percent/100;
				this.progress(installPercent,"Installing packages... "+percent+"%");
			}
		});
		await call("/sbin/apk",[
			"--no-cache",
			"--progress-fd",wt,
			"add","--initdb",
			"--root","/mnt",
			"--repository","/root/moonflower/apks",
			"--keys-dir","/root/moonflower/apkroot/etc/apk/keys",
			...this.packages
		]);

		this.progress(90,"Unmounting filesystems...");
		for (let chrootMount of this.chrootMounts)
			await call("/bin/umount",["/mnt/"+chrootMount]);

		await call("/bin/umount",["/mnt"]);

		this.progress(100,"Done");
		await delay(1000);
	}
}