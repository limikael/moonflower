export function bindArgs(fn, ...args) {
	return fn.bind(null,...args);
}

export function exValue(fn) {
	return (event)=>{
		fn(event.target.value);
	}
}