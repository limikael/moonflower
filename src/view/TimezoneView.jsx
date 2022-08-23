import Template from "./Template.jsx";
import {BsInput, BsGroupInput} from "../utils/bs-util.jsx"
import {timezones} from "../data/timezones.js";
import {exValue} from "../utils/js-util.js";

export default function TimezoneView({model}) {
	let tz={};
	for (let k in timezones)
		tz[k]=k;

	let locations={};
	for (let location of timezones[model.timezoneRegion])
		locations[location]=location;

	if (!Object.keys(locations).length)
		locations[""]=model.timezoneRegion;

	return <>
		<Template model={model}>
			<div class="text-start">
				<p class="mb-4 text-center">What timezone are you in?</p>

				<BsGroupInput title="Region" type="select"
					options={tz}
					value={model.timezoneRegion}
					onchange={exValue(model.setTimezoneRegion)}/>
				<BsGroupInput title="Location" type="select"
					options={locations}
					value={model.timezoneLocation}
					onchange={exValue(model.setTimezoneLocation)}/>
			</div>
		</Template>
	</>;
}
