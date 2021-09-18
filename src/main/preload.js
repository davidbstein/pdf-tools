// to run BEFORE the DOM is rendered
// can access the window, but can't pass its context to the window.

// The __dirname string points to the path of the currently executing script (in this case, your project's root folder).
// The path.join API joins multiple path segments together, creating a combined path string that works across all platforms.

/**
 *
 * currently this is not called by anything.
 */
// const console = require("console");
// const { contextBridge, ipcRenderer } = require("electron");

// contextBridge.exposeInMainWorld("electron", {
//   doThing: () => ipcRenderer.send("do-a-thing"),
//   // window.electron.doThing()
// });

// contextBridge.exposeInMainWorld("myAPI", {
//   desktop: true,
// });

// window.addEventListener("DOMContentLoaded", () => {
//   const element = document.getElementById("preload");
//   element.innerText = `chrome-version ${process.versions["chrome"]}`;
// });
