import Seq from "../../src/utils/Seq.js";
import {delay} from "../../src/utils/js-util.js";

describe("seq",()=>{
	it("can sequence",async ()=>{
		let seq=new Seq();
		seq.on("progress",(percent)=>{
			console.log("Percent: "+percent);
		});

		seq.add(async ()=>{await delay(100);});
		seq.add(async ()=>{
			await delay(100);
			seq.notifyPartialProgress(33);
			await delay(100);
			seq.notifyPartialProgress(66);
			await delay(100);
		},{size: 10});
		seq.add(async ()=>{await delay(100);});

		await seq.run();
	});
});