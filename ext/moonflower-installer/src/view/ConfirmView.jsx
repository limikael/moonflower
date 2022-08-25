import Template from "./Template.jsx";

export default function ConfirmView({model}) {
	function onNextClick() {
		model.startInstallation();
		model.next();
	}

	return <>
		<Template model={model}
				nextProps={{
					label: "Start Installation",
					onclick: onNextClick
				}}>
			<p>Ok let's go!</p>
		</Template>
	</>;
}