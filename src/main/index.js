"use strict";

import { app, BrowserWindow, Menu, dialog, ipcMain } from "electron";
import * as path from "path";
import { format as formatUrl } from "url";
import generateMenu from "./menu";
import os from "os";

const isDevelopment = process.env.NODE_ENV !== "production";

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;
let windows = new Set();
const DEFAULT_DIR = `${os.homedir()}/Dropbox/_Law`;
const currentPaths = {};

function createMainWindow() {
  const window = new BrowserWindow({
    title: "Stein PDF",
    x: 0,
    y: 0,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  if (isDevelopment) {
    //window.webContents.openDevTools();
  }

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
  } else {
    window.loadURL(
      formatUrl({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file",
        slashes: true,
      })
    );
  }

  window.on("closed", () => {
    mainWindow = null;
  });

  window.webContents.on("devtools-opened", () => {
    window.focus();
    setImmediate(() => {
      window.focus();
    });
  });

  Menu.setApplicationMenu(
    generateMenu(app, {
      openFile: (menuItem, browserWindow, event) => {
        console.log("OPEN FILE CLICKED");
        const fileName = dialog.showOpenDialogSync(mainWindow, {
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
  console.log(`MAIN WINDOW: ${window.id}`);
  return window;
}

function openPDFWindow(filePath) {
  const window = new BrowserWindow({
    width: 1600,
    height: 2000,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  if (isDevelopment) {
    window.webContents.openDevTools();
  }

  if (isDevelopment) {
    window.loadURL(
      `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?filePath=${encodeURIComponent(
        filePath
      )}`
    );
  } else {
    window.loadURL(
      formatUrl({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file",
        slashes: true,
      })
    );
  }

  window.on("closed", () => {
    windows.delete(window);
  });

  windows.add(window);
  console.log(`NEW WINDOW: ${window.id}`);
  currentPaths[window.id] = filePath;
}

app.whenReady().then(() => {});

app.on("open-file", (event, path) => {
  event.preventDefault();
  console.log(`trying to open ${path}`);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    mainWindow = createMainWindow();
  }
});

app.on("ready", () => {
  mainWindow = createMainWindow();
  mainWindow.setRepresentedFilename(DEFAULT_DIR);
  mainWindow.setDocumentEdited(false);
});

function getCurrentPathForSender(senderId) {
  return currentPaths[senderId] || DEFAULT_DIR;
}

ipcMain.on("getCurrentPath", (event, arg) => {
  const toRet = getCurrentPathForSender(event.sender.id);
  console.log(`getCurrentPath: ${event.sender.id}  -- ${arg} ===> ${toRet}`);
  event.returnValue = toRet;
});

ipcMain.on("navigateTo", (event, target) => {
  currentPaths[event.sender.id] = target;
  const curPath = currentPaths[event.sender.id];
  mainWindow.setRepresentedFilename(curPath);
  console.log(`navigateTo: ${event.sender.id}  -- ${target} ===> ${curPath}`);
  event.returnValue = curPath;
});

/**
 * open a new window to view the file
 */
ipcMain.on("openFile", (event, target) => {
  openPDFWindow(target);
  console.log(`openFile: ${event.sender.id}  -- ${target} ===> ${3}`);
});
