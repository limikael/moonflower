import DiskModel from "../../src/model/DiskModel.js";

describe("DiskModel",()=>{
	it("works",()=>{
		let diskModel=new DiskModel();
		diskModel.data=
			{
			  "blockdevices": [
			    {
			      "path": "/dev/sda",
			      "name": "sda",
			      "type": "disk",
			      "vendor": "ATA     ",
			      "model": "TOSHIBA MQ01ABF050",
			      "size": "465.8G",
			      "label": null,
			      "mountpoints": [
			        null
			      ],
			      "children": [
			        {
			          "path": "/dev/sda1",
			          "name": "sda1",
			          "type": "part",
			          "vendor": null,
			          "model": null,
			          "size": "457G",
			          "label": null,
			          "mountpoints": [
			            "/"
			          ]
			        },
			        {
			          "path": "/dev/sda2",
			          "name": "sda2",
			          "type": "part",
			          "vendor": null,
			          "model": null,
			          "size": "8.8G",
			          "label": null,
			          "mountpoints": [
			            "[SWAP]"
			          ]
			        }
			      ]
			    },
			    {
			      "path": "/dev/sdb",
			      "name": "sdb",
			      "type": "disk",
			      "vendor": "some",
			      "model": "other disk",
			      "size": "465.8G",
			      "label": null,
			      "mountpoints": [
			        null
			      ],
			    },
			    {
			      "path": "/dev/sdc",
			      "name": "sdc",
			      "type": "disk",
			      "vendor": "some",
			      "model": "other disk again",
			      "size": "465.8G",
			      "label": null,
			      "mountpoints": [
			        null
			      ],
			      "children": [
			        {
			          "path": "/dev/sdc1",
			          "name": "sdc1",
			          "type": "part",
			          "vendor": null,
			          "model": null,
			          "size": "457G",
			          "label": null,
			          "mountpoints": [
			            null
			          ]
			        },
			        {
			          "path": "/dev/sdc2",
			          "name": "sdc2",
			          "type": "part",
			          "vendor": null,
			          "model": null,
			          "size": "8.8G",
			          "label": null,
			          "mountpoints": [
			              null
			          ]
			        }
			      ]

			    },
			    {
			      "path": "/dev/sr0",
			      "name": "sr0",
			      "type": "rom",
			      "vendor": "HL-DT-ST",
			      "model": "HL-DT-ST DVDRAM GUE1N",
			      "size": "1024M",
			      "label": null,
			      "mountpoints": [
			        null
			      ]
			    }
			  ]
			};

//		console.log(diskModel.getUnmountedDisks());
		console.log(diskModel.getDisksWithUnmountedParts());

		console.log(diskModel.getUnmountedParts("/dev/sdc"));
	});
})