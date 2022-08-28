import {call} from "wun:subprocess";

document.body.innerHTML="<textarea id='el' style='width: 100%; height: 100%; background-color: #ccc'></textarea>";
let el=document.querySelector("#el");

async function main() {
	el.value=await call("/usr/bin/printenv",[],{
		env: {
			PKGSYSTEM_ENABLE_FSYNC: 0
		}
	});
}

main();
