import EventEmitter from "wun:events";
import StringDecoder, {LineSplitter} from "wun:decoder";

export default class Stream extends EventEmitter {
	constructor(fd,options={}) {
		super();

		this.options=options;
		this.decoder=new StringDecoder();
		this.lineSplitter=new LineSplitter();
		this.fd=fd;
		sys.watch(this.fd,sys.G_IO_IN,this.onFdData);
		//sys.watch(this.fd,sys.G_IO_HUP,this.onFdHup);
		sys.watch(this.fd,sys.G_IO_ERR,this.onFdErr);
	}

	readChunk=()=>{
		let s,data=sys.readCharCodeArray(this.fd,4096);
		if (data===null)
			s=this.decoder.end();

		else
			s=this.decoder.write(data);

		if (this.options.lines) {
			let a=this.lineSplitter.write(s);
			if (data===null)
				a=[...a,...this.lineSplitter.end()];

			for (let line of a)
				this.emit("data",line);
		}

		else {
			if (s)
				this.emit("data",s);
		}

		return (data!==null);
	}

	flush=()=>{
		while (this.readChunk())
			;
	}

	onFdData=()=>{
		if (this.readChunk()) {
			sys.watch(this.fd,sys.G_IO_IN,this.onFdData);
		}

		else {
			sys.close(this.fd);
			this.emit("close");
		}
	}

	onFdErr=()=>{
		this.emit("error");
		sys.close(this.fd);
		this.emit("close");
	}

	close=()=>{
		sys.close(this.fd);
	}
}

export function fopen(fn, mode) {
//	console.log(sys.O_RDONLY|sys.O_NONBLOCK);

	let fd=sys.open(fn,sys.O_RDONLY|sys.O_NONBLOCK);

	return new Stream(fd);
}
