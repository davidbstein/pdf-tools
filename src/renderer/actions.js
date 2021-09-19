import { ipcRenderer } from "electron";

export function getCurrentPath() {
  return ipcRenderer.sendSync("getCurrentPath");
}

export function listCurrentDir(hidden = false) {
  return listDir(getCurrentPath(), hidden);
}

export function handleFolderSelect(setCurrentPath, target) {
  console.log("navigate", target);
  ipcRenderer.sendSync("navigateTo", target);
  const curPath = getCurrentPath();
  document.title = curPath;
  setCurrentPath(curPath);
}

export function handleFileSelect(target) {
  console.log("opening", target);
  ipcRenderer.send("openFile", target);
}
