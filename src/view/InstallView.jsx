import Template from "./Template.jsx";
import {useEffect, useRef} from "react";
import {useEventListener} from "../utils/react-util.jsx";
import TermTextarea from "../utils/TermTextarea.jsx";

export default function ConfirmView({model}) {
	let putsref=useRef();

	useEventListener(model.subprocessModel,"data",(data)=>{
		putsref.current(data);
	});

	useEffect(()=>{
		model.startInstallation();
	});

	return <>
		<div style="width: 100%; height: 100%" class="p-3 d-flex flex-column">
			<div>
				<h1 class="text-center">Installing Moonflower</h1>
				<hr/>

				<div class="progress mb-3" style="height: 2em">
					<div class="progress-bar progress-bar-striped progress-bar-animated bg-info" role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100" style="width: 50%;"></div>
				</div>
			</div>

			<TermTextarea class="flex-fill form-control bg-black border-light text-success font-monospace"
					style="resize: none; overflow: hidden" putsref={putsref} />
		</div>
	</>;
}