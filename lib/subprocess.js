import EventEmitter from "wun:events";
import Stream from "wun:stream";

export class Subprocess extends EventEmitter {
	constructor(cmd, params=[], options={}) {
		super();
		this.cmd=cmd;
		this.params=params;
		this.options=options;
		this.run();
	}

	run=()=>{
		sys.on(sys.SIGCHLD,this.onSigchld);
		let [stdout_r,stdout_w]=sys.pipe();
		let [stderr_r,stderr_w]=sys.pipe();
		let options={...this.options,...{
			close: [stdout_r, stderr_r],
			dup: [
				stdout_w,sys.STDOUT_FILENO,
				stderr_w,sys.STDERR_FILENO
			]
		}};

		this.pid=sys.pspawn(this.cmd,this.params,options);
		sys.close(stdout_w);
		sys.close(stderr_w);

		this.stdout=new Stream(stdout_r,this.options);
		this.stdout.on("data",this.onStdout);
		this.stderr=new Stream(stderr_r,this.options);
		this.stderr.on("data",this.onStderr);
	}

	onStdout=(data)=>{
		this.emit("stdout",data);
		this.emit("data",data);
	}

	onStderr=(data)=>{
		this.emit("stderr",data);
		this.emit("data",data);
	}

	onSigchld=()=>{
		//console.log("sigchld, will wait: "+this.pid);
		let status=sys.waitpid(this.pid,sys.WNOHANG);
		if (status!==undefined) {
			sys.off(sys.SIGCHLD,this.onSigchld);
			this.stdout.flush();
			this.stdout.close();
			this.stderr.flush();
			this.stderr.close();
			this.status=status;
			this.emit("close",this.status);
		}
	}
}

export function spawn(cmd, params=[], options={}) {
	return new Subprocess(cmd,params,options);
}

export function call(cmd, params=[], options={}) {
	if (!options.expect)
		options.expect=0;

	let subprocess=spawn(cmd,params,options);
	return new Promise((resolve, reject)=>{
		let result="";

		subprocess.on("data",(data)=>{
			result+=data;
		});
		subprocess.on("close",(status)=>{
			if (status==options.expect)
				resolve(result);

			else
				reject(status);
		});
	});
}

export default {
	spawn,
	call
}