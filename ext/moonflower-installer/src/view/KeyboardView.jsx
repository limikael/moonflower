import Template from "./Template.jsx";
import {BsInput, BsGroupInput} from "../utils/bs-util.jsx"
import * as keyboards from "../data/keyboards.js";
import {exValue} from "../utils/js-util.js";

export default function KeyboardView({model}) {
	return <>
		<Template model={model}>
			<div class="text-start">
				<p class="mb-4 text-center">Choose keyboard layout</p>

				<BsGroupInput title="Keymap" type="select"
					options={keyboards.layouts}
					value={model.keyboardLayout}
					onchange={exValue(model.setKeyboardLayout)}/>
				<BsGroupInput title="Variant" type="select" 
					options={keyboards.variants[model.keyboardLayout]}
					value={model.keyboardVariant}
					onchange={exValue(model.setKeyboardVariant)}/>
			</div>
		</Template>
	</>;
}