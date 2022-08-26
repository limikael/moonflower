import Template from "./Template.jsx";
import {useEffect, useRef} from "react";
import {useEventListener} from "../utils/react-util.jsx";

function RunningContent({model}) {
	return <>
		<div class="d-flex flex-column" style="height: 100%">
			<div class="flex-grow-1"/>
			<div>
				<div class="text-center" style="height: 2em">
					<i>{model.installModel.message}</i>
				</div>
				<div class="progress" style="height: 2em">
					<div class="progress-bar progress-bar-striped progress-bar-animated bg-info"
						role="progressbar"
						aria-valuemin="0" aria-valuemax="100"
						aria-valuenow={model.installModel.percent}
						style={{width: `${model.installModel.percent}%`}}/>
				</div>
				<div style="height: 5em"/>
			</div>
			<div class="flex-grow-1"/>
		</div>
	</>
}

function CompleteContent({model}) {
	return <>
		<div class="text-center">
			<p class="text-center">Installation complete!</p>
			<p class="text-center">
				Please don't forget to remove the installation medium to boot
				from your harddrive.
			</p>
			<button class="btn btn-success btn-lg mt-5 px-5">Reboot</button>
		</div>
	</>
}

function ErrorContent({model}) {
	return <>
		<div class="text-center">
			<p class="text-center">Installation error!</p>
		</div>
	</>
}

export default function InstallView({model}) {
	let content;

	switch (model.installModel.state) {
		case "complete":
			content=<CompleteContent model={model}/>
			break;

		case "error":
			content=<ErrorContent model={model}/>
			break;

		case "running":
			content=<RunningContent model={model}/>
			break;
	}

	return <>
		<div style="width: 100%; height: 100%" class="p-3 d-flex flex-column">
			<div class="mb-4">
				<h1 class="text-center">Installing Moonflower</h1>
				<hr/>
			</div>
			{content}
		</div>
	</>;
}