import StringDecoder, {LineSplitter} from "wun:decoder";

let dec=new StringDecoder();
//console.log(dec.write(["\xe2\x96\x88e\xe2\x96\x88\xe2\x96\x88\xe2\x96\x88"));
console.log(dec.write(Uint8Array.from([0xe2,0x96,0x88,"e".charCodeAt(0),0xe2,0x96,0x88,0xe2,0x96,0x88,0xe2,0x96,0x88])));

let ln=new LineSplitter();
console.log(ln.write("hello\nworld"));
console.log(ln.end());