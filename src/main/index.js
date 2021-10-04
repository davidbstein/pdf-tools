import { app, ipcMain, Menu, dialog } from "electron";

import generateMenu from "./menu";
import {
  createFileBrowserWindow,
  createPDFWindow,
  getWindowRefs,
  getCurrentPath,
  setCurrentPath,
} from "./windowManagement";
import os from "os";

const DEFAULT_DIR = `${os.homedir()}/Dropbox/_Law/TEST`;

function _log() {
  // console.trace();
  console.log("main/index.js -- ", ...arguments);
}

/**
 * Application level actions. "ready" is the main application loop.
 */

app.on("ready", () => {
  _log(`APP EVENT -- ready`);
  initializeMenu();
  const bw = createFileBrowserWindow({ filePath: DEFAULT_DIR });
  _log(bw);
});

app.on("open-file", (event, path) => {
  _log(`APP EVENT -- open-file: ${path}`);
  event.preventDefault();
  _log(`trying to open ${path}`);
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

ipcMain.on("openFile", (event, { target, _id }) => {
  createPDFWindow({ filePath: target });
  _log(`IPC -- openFile: ${_id}  -- ${target} ===> ${3}`);
});

function initializeMenu() {
  Menu.setApplicationMenu(
    generateMenu(app, {
      Open: ({ application, menu, event }) => {
        console.log("OPEN FILE CLICKED", { application, menu, event });
        const fileName = dialog.showOpenDialogSync(window, {
          properties: ["openFile"],
        });
        console.log(fileName);
      },
      Save: ({ application, menu, event }) => {
        console.log("SAVE FILE CLICKED", { application, menu, event });
      },
      Close: ({ application, menu, event }) => {
        console.log("CLOSE FILE CLICKED", { application, menu, event });
      },
      Undo: ({ application, menu, event }) => {},
    })
  );
}
