import { app, BrowserWindow, Menu, dialog, ipcMain } from "electron";
import * as path from "path";
import { format as formatUrl } from "url";
import { fromFile as fileTypeFromFile } from "file-type";
import generateMenu from "./menu";
import fs from "fs";
import os from "os";

const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";
const DEFAULT_DIR = `${os.homedir()}/Dropbox/_Law`;
const DEFAULT_WEB_PREFERENCES = {
  nodeIntegration: true,
  contextIsolation: false,
  enableRemoteModule: true,
  nativeWindowOpen: false,
};
const _CurrentPaths = {};
let _win_refs_ = {}; // global reference to prevent garbage collection

function fileType(filePath) {
  if (fs.lstatSync(filePath).isDirectory()) return "directory";
  return fileTypeFromFile(filePath);
}

function createNewWindow(
  filePath = DEFAULT_DIR,
  { x, y, w: width, h: height } = { w: 800, h: 800, x: 0, y: 0 },
  webPreferences = DEFAULT_WEB_PREFERENCES
) {
  const newWindow = new BrowserWindow({ x, y, width, height, webPreferences });

  newWindow.on("close", () => {
    delete _win_refs_[newWindow.id];
  });

  let hostLocation = IS_DEVELOPMENT
    ? { pathname: `localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`, protocol: "http" }
    : { pathname: path.join(__dirname, "index.html"), protocol: "file" };
  let url = formatUrl({
    ...hostLocation,
    slashes: true,
    query: {
      filePath,
      windowId: newWindow.id,
      fileType: fileType(filePath),
    },
  });
  newWindow.loadURL(url);

  _win_refs_[newWindow.id] = newWindow;
  setCurrentPath([newWindow.id], filePath);
  console.log(`NEW WINDOW: ${newWindow.id} -- ${url}`);
  console.log(`Current Paths (by window ID): ${JSON.stringify(_CurrentPaths, null, 2)}`);
  return newWindow;
}

function createFileBrowserWindow(filePath = DEFAULT_DIR) {
  const newWindow = createNewWindow(filePath);
  if (IS_DEVELOPMENT) newWindow.webContents.openDevTools();
  return newWindow;
}

function openPDFWindow(filePath) {
  const newWindow = createNewWindow(filePath, { w: 1600, h: 1300 });
  if (IS_DEVELOPMENT) newWindow.webContents.openDevTools();
  return newWindow;
}

function initializeMenu() {
  Menu.setApplicationMenu(
    generateMenu(app, {
      openFile: (menuItem, browserWindow, event) => {
        console.log("OPEN FILE CLICKED");
        const fileName = dialog.showOpenDialogSync(window, {
          properties: ["openFile"],
        });
        console.log(fileName);
      },
      saveFile: (menuItem, browserWindow, event) => {
        console.log("SAVE FILE CLICKED");
      },
      closeFile: (menuItem, browserWindow, event) => {
        console.log("CLOSE FILE CLICKED");
        browserWindow.close(); // there's an event that can be intercepted here.
      },
    })
  );
}

/**
 * app is a global object is provided by electron
 * these are global application management listeners...
 */
app.whenReady().then(() => {});

app.on("open-file", (event, path) => {
  console.log(`APP EVENT -- open-file: ${path}`);
  event.preventDefault();
  console.log(`trying to open ${path}`);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
  app.quit();
});

app.on("activate", () => {
  console.log(`APP EVENT -- activate. widows.size = ${_win_refs_.size}`);
  if (_win_refs_.size == 0) {
    createFileBrowserWindow();
    initializeMenu();
  }
});

app.on("ready", () => {
  console.log(`APP EVENT -- ready`);
  const bw = createFileBrowserWindow();
  bw.setRepresentedFilename(DEFAULT_DIR);
  bw.setDocumentEdited(false);
});

// HELPER FUNCTIONS //
function getCurrentPath(windowId) {
  return _CurrentPaths[windowId] || DEFAULT_DIR;
}

function setCurrentPath(windowId, path) {
  return (_CurrentPaths[windowId] = path);
}

/**
 * ipc listeners manage communication with windows. windows have a unique sender ID that
 * is different from their window ID.
 */
ipcMain.on("getCurrentPath", (event, { _id }) => {
  const toRet = getCurrentPath(_id);
  console.log(`IPC -- getCurrentPath: ${_id} ===> ${toRet}`);
  event.returnValue = toRet;
});

ipcMain.on("navigateTo", (event, { target, _id }) => {
  setCurrentPath(_id, target);
  const curPath = getCurrentPath(_id);
  console.log("TODO: window.setRepresentedFilename(curPath)");
  console.log(`IPC -- navigateTo: ${_id}  -- ${target} ===> ${curPath}`);
  event.returnValue = curPath;
});

ipcMain.on("openFile", (event, { target, _id }) => {
  openPDFWindow(target);
  console.log(`IPC -- openFile: ${_id}  -- ${target} ===> ${3}`);
});
