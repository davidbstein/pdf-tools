import { Menu } from "electron";

export default function generateMenu(app, callbacks, genericCallback) {
  function doCallback(command, args) {
    console.log(
      `== menu command intercepted: ${command}. ${
        callbacks[command] ? "Handler available" : "NOT HANDLED"
      } ==`
    );
    const callback = callbacks[command] ? callbacks[command] : genericCallback;
    callback({ application: args[0], menu: args[1], event: args[2], command });
  }
  const TEMPLATE = [
    {
      label: "File",
      submenu: [
        {
          click: () => doCallback("Open", arguments),
          label: "Open",
          accelerator: "CmdOrCtrl+O",
        },
        {
          click: () => doCallback("Save", arguments),
          label: "Save",
          accelerator: "CmdOrCtrl+S",
        },
        {
          click: () => doCallback("Close", arguments),
          label: "Close",
          accelerator: "CmdOrCtrl+W",
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          click: () => doCallback("Undo", arguments),
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
        },
        {
          click: () => doCallback("Redo", arguments),
          label: "Redo",
          accelerator: "Shift+CmdOrCtrl+Z",
        },
        {
          type: "separator",
        },
        {
          click: () => doCallback("Cut", arguments),
          label: "Cut",
          accelerator: "CmdOrCtrl+X",
          role: "cut",
        },
        {
          click: () => doCallback("Copy", arguments),
          label: "Copy",
          accelerator: "CmdOrCtrl+C",
          role: "copy",
        },
        {
          click: () => doCallback("Paste", arguments),
          label: "Paste",
          accelerator: "CmdOrCtrl+V",
          role: "paste",
        },
      ],
    },
    {
      label: "Highlight",
      submenu: [
        {
          click: () => doCallback("Highlight", arguments),
          label: "Highlight",
        },
        {
          click: () => doCallback("Underline", arguments),
          label: "Underline",
        },
        {
          click: () => doCallback("Erase", arguments),
          label: "Erase",
        },
        {
          click: () => doCallback("Comment", arguments),
          label: "Comment",
        },
        {
          click: () => doCallback("Bookmark", arguments),
          label: "Bookmark",
        },
        {
          click: () => doCallback("Outline", arguments),
          label: "Outline",
        },
      ],
    },
    { role: "viewMenu" },
    { role: "windowMenu" },
    { role: "help", submenu: [{ label: "Learn More", click: callbacks?.help }] },
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
}
