#!/usr/bin/env node

import {XMLParser} from "fast-xml-parser";
import fs from "fs";

let parser=new XMLParser();
let evdev=parser.parse(fs.readFileSync("tools/apkroot/usr/share/X11/xkb/rules/evdev.xml"));

let layoutObjs=[];
for (let layout of evdev.xkbConfigRegistry.layoutList.layout) {
	layoutObjs.push({
		name: layout.configItem.name,
		description: layout.configItem.description,
	});
}

layoutObjs.sort((a,b)=>{
	if (a.description<b.description)
		return -1;

	if (a.description>b.description)
		return 1;

	return 0
});

let layouts={};
let variants={};

for (let layoutObj of layoutObjs) {
	layouts[layoutObj.name]=layoutObj.description;
	variants[layoutObj.name]={};
	variants[layoutObj.name][layoutObj.name]=layoutObj.description;
}

for (let k of Object.keys(layouts)) {
	if (!fs.existsSync("tools/apkroot/usr/share/bkeymaps/"+k)) {
		delete layouts[k];
		delete variants[k];
	}
}

for (let layout of evdev.xkbConfigRegistry.layoutList.layout) {
	if (layouts[layout.configItem.name] &&
			layout.variantList) {

		let a=layout.variantList.variant;
		if (!Array.isArray(a))
			a=[a];

		for (let variant of a) {
			let fn="tools/apkroot/usr/share/bkeymaps/"+
				layout.configItem.name+"/"+layout.configItem.name+"-"+
				variant.configItem.name+".bmap.gz"

			if (fs.existsSync(fn))
				variants[layout.configItem.name][variant.configItem.name]=variant.configItem.description;
		}
	}
}

//console.log(variants);

let s="";
s+="export const layouts="+JSON.stringify(layouts,null,2)+";\n\n";
s+="export const variants="+JSON.stringify(variants,null,2)+";\n\n";

fs.writeFileSync("src/data/keyboards.js",s);