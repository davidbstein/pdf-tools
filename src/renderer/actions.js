import { ipcRenderer } from "electron";

function sendSync(functionName, message = {}) {
  return ipcRenderer.sendSync(functionName, { _id: window._WINDOW_ID, ...message });
}

function send(functionName, message) {
  return ipcRenderer.send(functionName, { _id: window._WINDOW_ID, ...message });
}

export function getCurrentPath() {
  return sendSync("getCurrentPath");
}

export function listCurrentDir(hidden = false) {
  return listDir(getCurrentPath(), hidden);
}

export function handleFolderSelect(setCurrentPath, target) {
  console.log("navigate", target);
  sendSync("navigateTo", { target });
  const curPath = getCurrentPath();
  document.title = curPath;
  setCurrentPath(curPath);
}

export function handleFileSelect(target) {
  console.log("opening", target);
  send("openFile", { target });
}
