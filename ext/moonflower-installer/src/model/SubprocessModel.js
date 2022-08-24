import EventEmitter from "events";
import {call, spawn} from "wun:subprocess";

export default class DiskModel extends EventEmitter {
	constructor() {
		super();
	}

	isStarted=()=>{
		return !!this.subprocess;
	}

	startInstallation=()=>{
		if (this.subprocess)
			return;

		console.log("starting...");

		/*this.subprocess=spawn("/usr/bin/ssh",[
			'-lroot',
			'-p2222',
			'-oUserKnownHostsFile=/dev/null',
			'-oStrictHostKeyChecking=no',
			'localhost',
			'yes|setup-alpine -e -f  /root/moonflower/scripts/setup.txt'
		]);*/

		///usr/bin/ssh '-lroot' '-p2222' '-oUserKnownHostsFile=/dev/null' '-oStrictHostKeyChecking=no' 'localhost' 'yes|setup-alpine -e -f  /root/moonflower/scripts/setup.txt' > 

		this.subprocess=spawn("spec/data/slow.sh");

		this.subprocess.on("data",(data)=>{
			this.emit("data",data);
		});
	}
}