#!/usr/bin/wun
/*console.log("hello..");
sys.exec("/bin/ls",["/"]);
console.log("after..");*/

import {spawn,call} from "wun:subprocess";

let el=document.createElement("textarea");
el.style.width="100%";
el.style.height="24em";
document.body.appendChild(el);
el.value+="Testing subprocess...\n";

//let subprocess=spawn("/usr/bin/lsblk",["-OJ"]);
//let subprocess=spawn("test/date100");
//let subprocess=spawn("test/slow.sh");
//let subprocess=spawn("/bin/echo",["hello"]);
//let subprocess=spawn("/usr/bin/cat",["/awefawfwefhello"]);
//let subprocess=spawn("/usr/bin/ls");
let subprocess=spawn("/usr/bin/ls",[],{lines: true});
subprocess.on("data",(data)=>{
	console.log("data: "+data);
	el.value+=data;
	el.scrollTop = el.scrollHeight;
});
subprocess.on("close",(status)=>{
	el.value+="Process closed: "+status+"\n";
	console.log("Process closed: "+status);
});
