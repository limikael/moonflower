import fs from "wun:fs";

document.body.innerHTML="Testing writing...";

fs.writeFileSync("/tmp/testwrite.txt","hello worldåäö\n");

console.log("done...")
