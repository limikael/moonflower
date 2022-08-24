import EventEmitter from "events";
import {timezones} from "../data/timezones.js";
import {call,spawn} from "wun:subprocess";
import fs from "wun:fs";
import DiskModel from "./DiskModel.js";
import SubprocessModel from "./SubprocessModel.js";

export default class AppModel extends EventEmitter {
	constructor(routes) {
		super();

		this.routes=routes;
//		this.currentRouteIndex=6;
		this.currentRouteIndex=0;

		this.keyboardLayout="us";
		this.keyboardVariant="us";
		this.timezoneRegion="UTC";
		this.timezoneLocation="";

		this.installMethod="disk";
		this.installDisk=null;
		this.installPart=null;

		this.diskModel=new DiskModel();
		this.diskModel.on("change",this.onDiskModelChange);
		this.diskModel.updateDiskInfo();

		this.subprocessModel=new SubprocessModel();
	}

	onDiskModelChange=()=>{
		this.validateDiskChoice();
		this.emit("change");
	}

	getCurrentRouteComponent() {
//		let k=Object.keys(this.routes)[this.currentRouteIndex];
		return this.routes[this.currentRouteIndex].component;
	}

	next=()=>{
		this.currentRouteIndex++;
		this.emit("change");
	}

	back=()=>{
		this.currentRouteIndex--;
		this.emit("change");
	}

	setCurrentRouteIndex=(index)=>{
		this.currentRouteIndex=index;
		this.emit("change");
	}

	setKeyboardLayout=(layout)=>{
		if (layout!=this.keyboardLayout) {
			this.keyboardLayout=layout;
			this.keyboardVariant=layout;
			this.emit("change");
		}
	}

	setKeyboardVariant=(variant)=>{
		this.keyboardVariant=variant;
		this.emit("change");
	}

	setTimezoneRegion=(region)=>{
		if (region!=this.timezoneRegion) {
			this.timezoneRegion=region;
			this.timezoneLocation=timezones[region][0];
			this.emit("change");
		}
	}

	getTimezoneString=()=>{
		let s=this.timezoneRegion;

		if (this.timezoneLocation)
			s+="/"+this.timezoneLocation;

		return s;
	}

	setTimezoneLocation=(location)=>{
		this.timezoneLocation=location;
		this.emit("change");
	}

	setInstallMethod=(method)=>{
		this.installMethod=method;
		this.validateDiskChoice();
		this.emit("change");
	}

	setInstallDisk=(disk)=>{
		this.installDisk=disk;
		this.validateDiskChoice();
		this.emit("change");
	}

	setInstallPart=(part)=>{
		this.installPart=part;
		this.validateDiskChoice();
		this.emit("change");
	}

	validateDiskChoice=()=>{
		let diskOptions=this.getDiskOptions();
		if (!Object.keys(diskOptions).includes(this.installDisk))
			this.installDisk=Object.keys(diskOptions)[0];

		let partOptions=this.getPartOptions();
		if (!Object.keys(partOptions).includes(this.installPart))
			this.installPart=Object.keys(partOptions)[0];
	}

	getDiskOptions=()=>{
		let options;

		switch (this.installMethod) {
			case "disk":
				options=this.diskModel.getUnmountedDisks();
				break;

			case "part":
				options=this.diskModel.getDisksWithUnmountedParts();
				break;
		}

		return options;
	}

	getPartOptions=()=>{
		return this.diskModel.getUnmountedParts(this.installDisk);
	}

	getDiskError() {
		if (this.diskModel.error)
			return this.diskModel.error;

		if (!Object.keys(this.getDiskOptions()).length) {
			switch (this.installMethod) {
				case "disk":
					return "No disks available."
					return;

				case "part":
					return "No partitioned disks available."
					return;
			}
		}
	}

	setAutoUpdateDisks=(value)=>{
		this.diskModel.setAutoUpdate(value);
	}


	startInstallation=()=>{
		if (this.subprocessModel.isStarted())
			return;

		this.generateAnswerFile();
		this.subprocessModel.startInstallation();
	}

	getDiskParams=()=>{
		switch (this.installMethod) {
			case "disk":
				return this.installDisk;
				break;
		}

		throw new Error("only disk supported");
	}

	generateAnswerFile=()=>{
		let answerFileContents=
`
KEYMAPOPTS="${this.keyboardLayout+" "+this.keyboardVariant}"
HOSTNAMEOPTS=moonflower
DEVDOPTS=udev
INTERFACESOPTS=none
TIMEZONEOPTS="${this.getTimezoneString()}"
PROXYOPTS=none
APKREPOSOPTS="/root/moonflower/apks"
USEROPTS="-a -u -g audio,video,netdev juser"
SSHDOPTS=openssh
NTPOPTS=none
DISKOPTS="-m sys ${this.getDiskParams()}"
LBUOPTS=none
APKCACHEOPTS=none
`;
		fs.writeFileSync("/tmp/moonflower-install.txt",answerFileContents);
	}
}
