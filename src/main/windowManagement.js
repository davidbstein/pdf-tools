import { BrowserWindow } from "electron";
import * as path from "path";
import { format as formatUrl } from "url";
import { fromFile as fileTypeFromFile } from "file-type";
import fs from "fs";

const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";
const HOST_LOCATION = IS_DEVELOPMENT
  ? { pathname: `localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`, protocol: "http" }
  : { pathname: path.join(__dirname, "index.html"), protocol: "file" };

const DEFAULT_WEB_PREFERENCES = {
  nodeIntegration: true,
  contextIsolation: false,
  enableRemoteModule: true,
  nativeWindowOpen: false,
};
const DEFAULT_WINDOW_PREFERENCES = { w: 800, h: 800, x: 0, y: 0 };
const _CurrentPaths = {};

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
const _win_refs_ = {};
function addWindowRef(window) {
  _win_refs_[window.id] = window;
  window.on("close", () => {
    delete _win_refs_[window.id];
  });
}

export function getWindowRefs() {
  return _win_refs_;
}

function fileType(filePath) {
  if (fs.lstatSync(filePath).isDirectory()) return "directory";
  return fileTypeFromFile(filePath);
}

function _createURL(hostLocation, filePath, windowId) {
  return formatUrl({
    ...hostLocation,
    slashes: true,
    query: {
      filePath,
      windowId,
      fileType: fileType(filePath),
    },
  });
}

export function getCurrentPath(windowId) {
  return _CurrentPaths[windowId] || DEFAULT_DIR;
}

export function setCurrentPath(windowId, path) {
  return (_CurrentPaths[windowId] = path);
}

export function setWindowSaveFlag(windowId, isSaved) {
  const window = getWindowRefs()[windowId];
  const path = getCurrentPath(windowId);
  if (!window) return;
  if (isSaved) {
    window.setTitle(path);
  } else {
    window.setTitle(`* ${path}`);
  }
}

function _createNewWindow(filePath, windowPreferences = {}, webPreferences = {}) {
  const { width, height, x, y } = { ...DEFAULT_WINDOW_PREFERENCES, ...windowPreferences };
  webPreferences = { ...DEFAULT_WEB_PREFERENCES, ...webPreferences };

  const newWindow = new BrowserWindow({ x, y, width, height, webPreferences });
  const url = _createURL(HOST_LOCATION, filePath, newWindow.id);
  addWindowRef(newWindow);

  newWindow.loadURL(url);
  setCurrentPath([newWindow.id], filePath);

  console.log(`NEW WINDOW: ${newWindow.id} -- ${url}`);
  console.log(`Current Paths (by window ID): ${JSON.stringify(_CurrentPaths, null, 2)}`);
  return newWindow;
}

export function createFileBrowserWindow({ filePath, debug = false }) {
  const newWindow = _createNewWindow(filePath);
  newWindow.setRepresentedFilename(filePath);
  newWindow.setDocumentEdited(false);
  if (debug) newWindow.webContents.openDevTools();
  return newWindow;
}

export function createPDFWindow({ filePath, debug = false }) {
  const newWindow = _createNewWindow(filePath, { width: 1600, height: 1300 });
  newWindow.setRepresentedFilename(filePath);
  newWindow.setDocumentEdited(false);
  if (debug) newWindow.webContents.openDevTools();
  return newWindow;
}

export function sendMessageToActiveWindow(channel, message) {
  const activeWindow = BrowserWindow.getFocusedWindow();
  if (activeWindow) activeWindow.webContents.send(channel, message);
}
