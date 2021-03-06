import { app, ipcMain, Menu, dialog } from "electron";

import generateMenu from "./menu";
import {
  createFileBrowserWindow,
  createPDFWindow,
  getWindowRefs,
  getCurrentPath,
  setCurrentPath,
  sendMessageToActiveWindow,
  setWindowSaveFlag,
} from "./windowManagement";
import { getConfig } from "../common/defaults";
import os from "os";
import fs from "fs";

const DEFAULT_DIR = getConfig("DEFAULT_DIR", `${os.homedir()}/Dropbox/_Law/TEST`);
const _state = {
  ready: false,
  files_to_open: [],
};

function _log() {
  console.log(...arguments);
  fs.writeFile("/tmp/stein-pdf.log", `${JSON.stringify(arguments)}\n`, { flag: "a+" }, (err) => {
    if (err) throw err;
  });
}

/**
 * Application level actions. "ready" is the main application loop.
 */

app.on("open-url", (event, url) => {
  dialog.showErrorBox("Welcome Back", `You arrived from: ${url}`);
});

app.on("ready", () => {
  _log(`APP EVENT -- ready ${process.argv.join(" . ~~~ .")}`);
  const last_argv = process.argv.slice(-1)[0];
  initializeMenu();
  const bw = createFileBrowserWindow({ filePath: DEFAULT_DIR });
  for (let file of _state.files_to_open) {
    _log(`opening... ${file}`);
    createPDFWindow(file);
  }
  _state.ready = true;
  _log(bw);
});

app.on("open-file", (event, path) => {
  _log(`APP EVENT -- open-file: ${path}`);
  event.preventDefault();
  if (_state.ready) {
    _log(`trying to open ${path}`);
    createPDFWindow({ filePath: path });
  } else {
    _log(`once ready I will open ${path}`);
    _state.files_to_open.push(path);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
  app.quit();
});

app.on("activate", () => {
  _log(`APP EVENT -- activate. widows.size = ${getWindowRefs().size}`);
  if (getWindowRefs().size == 0) {
    initializeMenu();
    createFileBrowserWindow({ filePath: DEFAULT_DIR });
  }
});

/**
 * ipc listeners manage communication with windows. windows have a unique sender ID that
 * is different from their window ID.
 */
ipcMain.on("getCurrentPath", (event, { _id }) => {
  const toRet = getCurrentPath(_id);
  _log(`IPC -- getCurrentPath: ${_id} ===> ${toRet}`);
  event.returnValue = toRet;
});

ipcMain.on("navigateTo", (event, { target, _id }) => {
  setCurrentPath(_id, target);
  const curPath = getCurrentPath(_id);
  _log("TODO: window.setRepresentedFilename(curPath)");
  _log(`IPC -- navigateTo: ${_id}  -- ${target} ===> ${curPath}`);
  event.returnValue = curPath;
});

ipcMain.on("setIsSaved", (event, { isSaved, _id }) => {
  _log(`IPC -- setIsSaved: ${_id} ===> ${isSaved}`);
  setWindowSaveFlag(_id, isSaved);
  event.returnValue = isSaved;
});

ipcMain.on("openFile", (event, { target, _id }) => {
  createPDFWindow({ filePath: target });
  app.addRecentDocument(target);
  _log(`IPC -- openFile: ${_id}  -- ${target} ===> ${3}`);
});

function initializeMenu() {
  Menu.setApplicationMenu(
    generateMenu(
      app,
      {
        Open: ({ application, menu, event }) => {
          console.log("OPEN FILE CLICKED", { application, menu, event });
          const [fileName] = dialog.showOpenDialogSync({
            properties: ["openFile"],
          });
          console.log(fileName);
          createPDFWindow({ filePath: fileName });
          app.addRecentDocument(fileName);
        },
        Save: ({ application, menu, event }) => {
          console.log("SAVE FILE CLICKED", { application, menu, event });
          sendMessageToActiveWindow("menu-clicked", { command: "save" });
        },
        Close: ({ application, menu, event }) => {
          console.log("CLOSE FILE CLICKED", { application, menu, event });
          sendMessageToActiveWindow("menu-clicked", { command: "close" });
        },
      },
      ({ command, application, menu, event }) => {
        console.log("MENU CLICKED", { command, event });
        sendMessageToActiveWindow("menu-clicked", { command });
      }
    )
  );
}
