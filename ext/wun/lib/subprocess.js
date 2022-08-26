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
		let stdout=sys.pipe();
		let stderr=sys.pipe();
		this.pid=sys.fork();

		// Child
		if (!this.pid) {
			sys.close(stdout[0]);
			sys.close(stderr[0]);
			sys.dup2(stdout[1],sys.STDOUT_FILENO);
			sys.dup2(stderr[1],sys.STDERR_FILENO);

			try {
				sys.exec(this.cmd,this.params);
			}

			catch (e) {
				if (e.message)
					sys.writeCharCodeArray(sys.STDERR_FILENO,e.message.split("").map(c=>c.charCodeAt(0)));
			}
			sys._exit(-1);
		}

		// Parent
		else {
			//console.log("pid: "+this.pid);
			sys.close(stdout[1]);
			sys.close(stderr[1]);
			this.stdout=new Stream(stdout[0],this.options);
			this.stdout.on("data",this.onStdout);
			this.stderr=new Stream(stderr[0],this.options);
			this.stderr.on("data",this.onStderr);
		}
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