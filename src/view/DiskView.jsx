import Template from "./Template.jsx";
import {BsInput, BsGroupInput} from "../utils/bs-util.jsx"
import {exValue} from "../utils/js-util.js";
import {useEffect} from "react";

export default function KeyboardView({model}) {
	useEffect(()=>{
		model.setAutoUpdateDisks(true);
		return (()=>{
			model.setAutoUpdateDisks(false)
		});
	},[]);

	let diskClass="";
	if (model.getDiskError())
		diskClass="text-muted";

	return <>
		<Template model={model}>
			<div class="text-start">
				<p class="mb-4 text-center">
					Where do you want to install?
				</p>

				<BsGroupInput title="Installation type" type="select" 
						options={{
							"disk": "Install on entire disk",
							"part": "Install on existing partition"
						}}

						value={model.installMethod}
						onchange={exValue(model.setInstallMethod)}
				/>

				<BsGroupInput title="Disk" type="select" 
						options={model.getDiskOptions()}
						onchange={exValue(model.setInstallDisk)}
						class={diskClass}>
					{model.getDiskError() &&
						<option selected disabled>{model.getDiskError()}</option>
					}
				</BsGroupInput>

				{model.installMethod=="part" &&
						!!Object.keys(model.getPartOptions()).length &&
					<BsGroupInput title="Partition" type="select" 
							options={model.getPartOptions()}
					/>
				}
			</div>
		</Template>
	</>;
}