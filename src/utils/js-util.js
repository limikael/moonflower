export function bindArgs(fn, ...args) {
	return fn.bind(null,...args);
}

export function exValue(fn) {
	return (event)=>{
		fn(event.target.value);
	}
}

export function delay(millis) {
	return new Promise((resolve,reject)=>{
		setTimeout(resolve,millis);
	});
}