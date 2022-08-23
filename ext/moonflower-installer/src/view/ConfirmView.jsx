import Template from "./Template.jsx";

export default function ConfirmView({model}) {
	return <>
		<Template model={model} nextProps={{label: "Start Installation"}}>
			<p>Ok let's go!</p>
		</Template>
	</>;
}