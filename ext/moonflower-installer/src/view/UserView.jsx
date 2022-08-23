import Template from "./Template.jsx";
import {BsInput, BsGroupInput} from "../utils/bs-util.jsx"

export default function KeyboardView({model}) {
	return <>
		<Template model={model}>
			<div class="text-start">
				<p class="mb-4 text-center">
					Let's create a user for your system.
				</p>

				<BsGroupInput title="User" type="text"/>
				<BsGroupInput title="Password" type="password"/>
				<BsGroupInput title="Repeat password" type="password"/>
			</div>
		</Template>
	</>;
}