#!/usr/bin/env node

import klawSync from "klaw-sync";
import fs from "fs";
import path from "path";

let regionNames=[
	"Africa", "America", "Antarctica", "Arctic", "Asia", "Atlantic", 
	"Australia", "Brazil", "Canada", "Chile", "Europe", "Indian", 
	"Mexico", "Pacific", "US", "UTC"
];

regionNames.sort();
let regions={};

for (let regionName of regionNames)
	regions[regionName]=[];

for (let p of klawSync("tools/apkroot/usr/share/zoneinfo")) {
	let rel=path.relative("tools/apkroot/usr/share/zoneinfo",p.path);
	let region=rel.split("/")[0];
	let location=rel.split("/").slice(1).join("/");

	if (location && regionNames.includes(region))
		regions[region].push(location);
}

for (let k in regions)
	regions[k].sort();

let s="";
s+="export const timezones="+JSON.stringify(regions,null,2)+";\n\n";

fs.writeFileSync("src/data/timezones.js",s);
