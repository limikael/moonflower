import {delay} from "./js-util.js";
import EventEmitter from "events";

export default class Seq extends EventEmitter {
	constructor() {
		super();

		this.tasks=[];
	}

	add(fn, options={}) {
		let task={...options, fn};
		if (task.size===undefined)
			task.size=1;

		this.tasks.push(task);
	}

	notifyPartialProgress(percent) {
		let totalProgress=this.mainProgress+this.currentTask.size*percent/100;
		this.notifyProgress(Math.round(100*totalProgress/this.totalSize));
	}

	async run() {
		this.totalSize=0;
		for (let task of this.tasks)
			this.totalSize+=task.size;

		this.mainProgress=0;
		this.notifyProgress(Math.round(100*this.mainProgress/this.totalSize));

		await delay(0);

		this.mainProgress=0;
		for (let i=0; i<this.tasks.length; i++) {
			this.currentTask=this.tasks[i];
			await this.currentTask.fn();
			this.mainProgress+=this.currentTask.size;
			this.notifyProgress(Math.round(100*this.mainProgress/this.totalSize));
		}
	}

	getPercent() {
		return this.percent;
	}

	notifyProgress(percent) {
		this.percent=percent;
		this.emit("progress",percent);
	}
}