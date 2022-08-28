let fd=sys.open("README.md",sys.O_RDONLY);
let data=sys.read(fd,1000);
console.log(data);
console.log(data.length);

let enc=new TextDecoder("utf-8");
console.log(enc.decode(data))