export function basename(s) {
	let a=s.split("/").filter(t=>!!t);
	if (!a.length)
		return "";

	return a[a.length-1];
}

export function dirname(s) {
	let a=s.split("/").filter(t=>!!t);
	a.splice(-1);
	if (!a.length)
		return (s[0]=="/"?"/":".");

	return (s[0]=="/"?"/":"")+a.join("/");
}

export default {
	basename,
	dirname
}