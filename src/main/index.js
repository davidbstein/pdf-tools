import { app, BrowserWindow, Menu, dialog, ipcMain } from "electron";
import * as path from "path";
import { format as formatUrl } from "url";
import generateMenu from "./menu";
import os from "os";

const isDevelopment = process.env.NODE_ENV !== "production";
const DEFAULT_DIR = `${os.homedir()}/Dropbox/_Law`;
const DEFAULT_WEB_PREFERENCES = {
  nodeIntegration: true,
  contextIsolation: false,
  enableRemoteModule: true,
  nativeWindowOpen: false,
};
const currentPaths = {};

// global reference to prevent garbage collection
let windows = {};

function createNewWindow(filePath = DEFAULT_DIR, { x, y, w, h } = { w: 800, h: 800, x: 0, y: 0 }) {
  const newWindow = new BrowserWindow({
    x: x,
    y: y,
    width: w,
    height: h,
    webPreferences: DEFAULT_WEB_PREFERENCES,
  });

  newWindow.on("close", () => {
    delete windows[newWindow.id];
    newWindow.unref;
  });

  windows[newWindow.id] = newWindow;
  currentPaths[newWindow.id] = filePath;
  console.log(`NEW WINDOW: ${newWindow.id}`);
  console.log(`Current Paths (by window ID): ${JSON.stringify(currentPaths, null, 2)}`);
  return newWindow;
}

/**
 * Creates a new windows for viewing a pdf.
 * @param {string} filePath the starting directory
 */
function createFileBrowserWindow(filePath = DEFAULT_DIR) {
  const newWindow = createNewWindow(filePath);
  if (isDevelopment) {
    newWindow.loadURL(
      `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?windowId=${newWindow.id}`
    );
  } else {
    newWindow.loadURL(path.join(__dirname, "index.html")); // might need generatic path creator for windows
  }
  return newWindow;
}

/**
 * Creates a new windows for viewing a pdf.
 * @param {string} filePath the path to the pdf file.
 */
function openPDFWindow(filePath) {
  const newWindow = createNewWindow(filePath, { w: 1600, h: 1300 });
  if (isDevelopment) {
    newWindow.webContents.openDevTools();
    newWindow.loadURL(
      `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?filePath=${encodeURIComponent(
        filePath
      )}&windowId=${newWindow.id}`
    );
  } else {
    newWindow.loadURL(path.join(__dirname, "index.html")); // might need generatic path creator for windows
  }
  return newWindow;
}

/**
 * initialize the default menus and bind them.
 */
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
 * app is a global object provided by electron
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
  console.log(`APP EVENT -- activate. widows.size = ${windows.size}`);
  if (windows.size == 0) {
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

// HELPER FUNCTIONS //ß
function getCurrentPathForSender(senderId) {
  return currentPaths[senderId] || DEFAULT_DIR;
}

/**
 * ipc listeners manage communication with windows. windows have a unique sender ID that
 * is different from their window ID.
 */
ipcMain.on("getCurrentPath", (event, { _id }) => {
  const toRet = getCurrentPathForSender(_id);
  console.log(`IPC -- getCurrentPath: ${_id} ===> ${toRet}`);
  event.returnValue = toRet;
});

ipcMain.on("navigateTo", (event, { target, _id }) => {
  currentPaths[_id] = target;
  const curPath = currentPaths[_id];
  console.log("TODO: window.setRepresentedFilename(curPath)");
  console.log(`IPC -- navigateTo: ${_id}  -- ${target} ===> ${curPath}`);
  event.returnValue = curPath;
});

ipcMain.on("openFile", (event, { target, _id }) => {
  openPDFWindow(target);
  console.log(`IPC -- openFile: ${_id}  -- ${target} ===> ${3}`);
});
