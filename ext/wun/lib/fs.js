import StringDecoder from "wun:decoder";

export function readFileSync(fn) {
	let fd=sys.open(fn,sys.O_RDONLY);
	let decoder=new StringDecoder();
	let data,res="";

	do {
		data=sys.read(fd,4096);
		res+=decoder.write(data);
	} while (data!==null);

	sys.close(fd);
	res+=decoder.end();

	return res;
}

export function writeFileSync(fn, content) {
	let encoder=new TextEncoder();
	let data=encoder.encode(content);

	let fd=sys.open(fn,sys.O_WRONLY|sys.O_CREAT|sys.O_TRUNC);
	while (data.length)
		data=data.slice(sys.write(fd,data));

	sys.close(fd);
}

export default {
	readFileSync,
	writeFileSync
}