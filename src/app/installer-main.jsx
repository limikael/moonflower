#!/usr/bin/wun

window.resizeTo(750,450);
window.title="Install Moonflower";

import InstallerApp from "./InstallerApp.jsx";

let el=document.createElement("div");
document.body.appendChild(el);

render(<InstallerApp/>,el);
