import {useRef, useReducer, useState, useEffect, useLayoutEffect, useMemo, useCallback} from "react";

export function useInstance(cls, ...ctorArgs) {
	let ref=useRef();

	if (!ref.current)
		ref.current=new cls(...ctorArgs);

	return ref.current;
}

export function useForceUpdate() {
	const [_, forceUpdate] = useReducer((x) => x + 1, 1);

	return forceUpdate;
}

export function useImmediateEffect(effect, deps) {
	const cleanupRef = useRef();
	const depsRef = useRef();

	function depsDiff(deps1, deps2) {
		return !((Array.isArray(deps1) && Array.isArray(deps2)) &&
			deps1.length === deps2.length &&
			deps1.every((dep, idx) => Object.is(dep, deps2[idx]))
		);
	}

	if (!depsRef.current || depsDiff(depsRef.current, deps)) {
		depsRef.current = deps;

		if (cleanupRef.current) {
			cleanupRef.current();
		}

		cleanupRef.current = effect();
	}

	useEffect(() => {
		return () => {
			if (cleanupRef.current) {
				cleanupRef.current();
			}
		};
	}, []);
};

export function useEventListener(target, event, func) {
	useImmediateEffect(()=>{
		function onEvent(...params) {
			func(...params);
		}

		if (target) {
			if (target.on)
				target.on(event,onEvent);

			else if (target.addEventListener)
				target.addEventListener(event,onEvent);

			else throw new Error("not an event dispatcher");

			return (()=>{
				if (target.off)
					target.off(event,onEvent);

				else if (target.removeEventListener)
					target.removeEventListener(event,onEvent);

				else throw new Error("not an event dispatcher");
			});
		}
	},[target,event]);
}

export function useEventUpdate(target, event) {
	let forceUpdate=useForceUpdate();
	useEventListener(target,event,forceUpdate);
}

export function optionsFromObject(o) {
	let options=[];

	for (let k in o)
		options.push(
			<option value={k}>{o[k]}</option>
		);

	return options;
}
