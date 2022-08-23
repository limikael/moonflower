import EventEmitter from "events";
import {call} from "wun:subprocess";

export default class DiskModel extends EventEmitter {
	constructor() {
		super();
		this.data=null;
	}

	updateDiskInfo=()=>{
		if (this.updatePromise)
			return;

		this.updatePromise=call("/bin/lsblk",[
			"-JT",
			"-oPATH,NAME,TYPE,VENDOR,MODEL,SIZE,LABEL,MOUNTPOINTS"
		]);

		this.updatePromise
			.then((s)=>{
				this.error=null;
				this.data=JSON.parse(s);
			})
			.catch((e)=>{
				this.error=e.message;
				this.data=null;

			})
			.finally(()=>{
				this.updatePromise=null;
				this.emit("change");
				if (this.autoUpdate)
					setTimeout(this.updateDiskInfo,5000);
			});
	}

	setAutoUpdate=(value)=>{
		this.autoUpdate=value;
		if (this.autoUpdate)
			this.updateDiskInfo();
	}

	isUnmounted(data) {
		for (let mountpoint of data.mountpoints)
			if (mountpoint)
				return false;

		if (data.children)
			for (let child of data.children)
				if (!this.isUnmounted(child))
					return false;

		return true;
	}

	hasUnmounted(data) {
		for (let mountpoint of data.mountpoints)
			if (mountpoint)
				return false;

		if (data.children)
			for (let child of data.children)
				if (this.isUnmounted(child))
					return true;

		return false;
	}

	formatDiskData(data) {
		return data.name.toUpperCase()+": "+data.vendor.trim()+" "+data.model.trim()+" - "+data.size;
	}

	formatPart(data, i) {
		return data.name.toUpperCase()+": Partition #"+i+" - "+data.size;
	}

	getUnmountedDisks() {
		let res={};

		if (!this.data)
			return null;

		for (let data of this.data.blockdevices) {
			if (data.type=="disk" && this.isUnmounted(data))
				res[data.path]=this.formatDiskData(data);
		}

		return res;
	}

	getDisksWithUnmountedParts() {
		let res={};

		if (!this.data)
			return null;

		for (let data of this.data.blockdevices) {
			if (data.type=="disk" && this.hasUnmounted(data))
				res[data.path]=this.formatDiskData(data);
		}

		return res;
	}

	getUnmountedParts(diskPath) {
		let diskData,res={};

		if (!this.data)
			return null;

		for (let data of this.data.blockdevices)
			if (data.type=="disk" && this.hasUnmounted(data) && data.path==diskPath)
				diskData=data;

		if (!diskData)
			return res;

		let i=0;
		for (let part of diskData.children)
			if (part.type=="part") {
				i++;
				if (this.isUnmounted(part))
					res[part.path]=this.formatPart(part,i);
			}

		return res;
	}
}