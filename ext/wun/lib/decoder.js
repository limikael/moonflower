export default class StringDecoder {
	constructor() {
		this.tmpBuffer=[];
		this.buffer="";
		this.decoder=new TextDecoder("utf-8");
	}

	writeCharCode(i) {
		this.tmpBuffer.push(i);
		this.flush();
	}

	write(data) {
		if (data)
			for (let c of data)
				this.writeCharCode(c);

		let s=this.buffer;
		this.buffer="";
		return s;
	}

	end(data) {
		if (data)
			for (let c of data)
				this.writeCharCode(c);

		this.forceFlush();

		let s=this.buffer;
		this.buffer="";
		return s;
	}

	flush() {
		for (let i=0; i<this.tmpBuffer.length; i++) {
			let s=this.decoder.decode(new Uint8Array(this.tmpBuffer.slice(0,i+1)));
			if (s.charCodeAt(0) && s.length==1 && s.charCodeAt(0)!=65533) {
				this.buffer+=s[0];
				this.tmpBuffer.splice(0,i+1);
				return;
			}
			if (s.length==2) {
				this.buffer+=s[0];
				this.tmpBuffer.splice(0,i);
				this.flush();
				return;
			}
		}
	}

	forceFlush() {
		this.buffer+=this.decoder.decode(new Uint8Array(this.tmpBuffer));
		this.tmpBuffer=[];
	}
}

export class LineSplitter {
	constructor() {
		this.tmpBuffer="";
	}

	write(data) {
		if (data)
			this.tmpBuffer+=data;

		let a=this.tmpBuffer.split("\n")
		this.tmpBuffer=a.slice(a.length-1)[0];

		return a.slice(0,a.length-1);
	}

	end(data) {
		let a=this.write(data);

		if (this.tmpBuffer)
			a=[...a,this.tmpBuffer];

		this.tmpBuffer="";
		return a;
	}
}