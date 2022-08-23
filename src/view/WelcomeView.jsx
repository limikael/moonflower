import Template from "./Template.jsx";

export default function WelcomeView({model}) {
	return <>
		<Template model={model} backProps={{disabled:true}}>
			<p>Welcome to the Moonflower installer!</p>
		</Template>
	</>;
}