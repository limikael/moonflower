import {useRef} from "react";

function useRefObject(initial) {
	return useRef(initial).current;
}

function stringReplaceAt(s, index, replacement) {
	if (index > s.length) {
		return s;
	}

	return s.substring(0, index) + replacement + s.substring(index + 1);
}

export default function TermTextarea(props) {
	let ref=useRef();
	let state=useRefObject({lineEls: [], line: 0, col: 0});

	function processEscapeSequence() {
		switch (state.escapeSequence) {
			case "7":
				state.storedLine=state.line;
				state.storedCol=state.col;
				break;

			case "8":
				state.line=state.storedLine;
				state.col=state.storedCol;
				//state.col=0;
				break;

			case "[0K":
				//let s=state.lineEls[state.line].textContent;
				//s=s.substr(0,state.col);
				//state.lineEls[state.line].textContent=s;
				break;

			default:
				console.log("Unknown ansi: "+state.escapeSequence);
				break;
		}
	}

	function putc(c) {
		if (c.charCodeAt(0)==0x1b) {
			state.escaping=true;
			state.escapeSequence="";
		}

		else if (state.escaping) {
			state.escapeSequence+=c;

			if (c!="[" &&
					(state.escapeSequence.length==1 || c.charCodeAt(0)>=0x40)) {
				state.escaping=false;
				processEscapeSequence();
			}
		}

		else {
			if (c=="\n") {
				state.line++;
				state.col=0;
				return;
			}

			if (!state.lineEls[state.line]) {
				state.lineEls[state.line]=document.createElement("div");
				ref.current.appendChild(state.lineEls[state.line]);
			}


			let s=state.lineEls[state.line].textContent;
			s=stringReplaceAt(s,state.col,c);
			state.lineEls[state.line].textContent=s;

			state.col++;
		}
	}

	function puts(data) {
		for (let c of data)
			putc(c);

		let textarea=ref.current;
		textarea.scrollTop=textarea.scrollHeight;
	}

	props.putsref.current=puts;

	return (
		<div {...props} ref={ref} />
	);
}