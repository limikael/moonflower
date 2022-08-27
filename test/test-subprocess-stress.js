#!/usr/bin/wun

import {spawn,call} from "wun:subprocess";

let el=document.createElement("textarea");
el.style.width="100%";
el.style.height="24em";
document.body.appendChild(el);
el.value+="Testing subprocess...\n";

function delay(millis) {
	return new Promise((resolve)=>{
		setTimeout(resolve,millis);
	});
}

async function main() {
	console.log("pid: "+sys.getpid());
	let promises=[];

	for (let i=0; i<1000; i++) {
		console.log("Iteration: "+i);
		//promises.push(call("/usr/bin/echo",["hello: ",i]));

		let out=await call("/usr/bin/echo",["hello: ",i]);
		console.log("out: "+out.trim());
	}

	await Promise.all(promises);

	console.log("done...");
}

main();