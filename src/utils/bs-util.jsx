import {optionsFromObject} from "./react-util.jsx";

export function BsInput({...props}) {
//	let options=usePromise(props.options,[props.options]);
	let options=props.options;

	let cls="";
	if (props.class)
		cls+=props.class;

	delete props.class;

	if (props.type=="textarea")
		return (
			<textarea class={"form-control p-2 "+cls} {...props}>{props.value}</textarea>
		);

	if (props.type=="select") {
		let optionElements=null;
		if (options)
			optionElements=optionsFromObject(options);

		return (
			<select class={"form-select p-2 "+cls} {...props}>
				{optionElements}
				{props.children}
			</select>
		);
	}

	return (
		<input class="form-control p-2" {...props} />
	);

}

export function BsGroupInput({title, ...props}) {
	return (
		<div class="form-group row mb-3">
			<label class="col-12 col-sm-4 col-form-label p-2">{title}</label>
			<div class="col-12 col-sm-8">
				<BsInput {...props}/>
			</div>
		</div>
	);
}