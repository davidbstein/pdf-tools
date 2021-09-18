import { Menu } from "electron";

export default (app, { openFile, saveFile, closeFile }) => {
  const TEMPLATE = [
    {
      label: "File",
      submenu: [
        {
          label: "Open",
          accelerator: "CmdOrCtrl+O",
          click: openFile,
        },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: saveFile,
        },
        {
          label: "Close",
          accelerator: "CmdOrCtrl+W",
          click: closeFile,
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          role: "undo",
        },
        {
          label: "Redo",
          accelerator: "Shift+CmdOrCtrl+Z",
          role: "redo",
        },
        {
          type: "separator",
        },
        {
          label: "Cut",
          accelerator: "CmdOrCtrl+X",
          role: "cut",
        },
        {
          label: "Copy",
          accelerator: "CmdOrCtrl+C",
          role: "copy",
        },
        {
          label: "Paste",
          accelerator: "CmdOrCtrl+V",
          role: "paste",
        },
        {
          label: "Select All",
          accelerator: "CmdOrCtrl+A",
          role: "selectall",
        },
      ],
    },
  ];

  if (process.platform == "darwin") {
    var name = app.getName();
    TEMPLATE.unshift({
      label: name,
      submenu: [
        {
          label: "About " + name,
          role: "about",
        },
        {
          type: "separator",
        },
        {
          label: "Services",
          role: "services",
          submenu: [],
        },
        {
          type: "separator",
        },
        {
          label: "Hide " + name,
          accelerator: "Command+H",
          role: "hide",
        },
        {
          label: "Hide Others",
          accelerator: "Command+Alt+H",
          role: "hideothers",
        },
        {
          label: "Show All",
          role: "unhide",
        },
        {
          type: "separator",
        },
        {
          label: "Quit",
          accelerator: "Command+Q",
          click() {
            app.quit();
          },
        },
      ],
    });
  }
  return Menu.buildFromTemplate(TEMPLATE);
};
