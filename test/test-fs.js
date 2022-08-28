import fs from "wun:fs";
console.log("i'm running...");

document.body.innerHTML="Hello...<br/><textarea id='el' style='width: 100%; height: 24em'></textarea>";
let el=document.querySelector("#el");
el.value="Testing stufff...\n";

setTimeout(()=>{
	let v=fs.readFileSync("test/installout.txt");
	el.value+=v;
},100);
