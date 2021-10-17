import "@/renderer";
import "pdfjs-dist/webpack";
import { ipcRenderer } from "electron";
import { Logger, emitEvent } from "@/helpers";

//const log = console.log;
const logger = new Logger("@/index.js");

ipcRenderer.on("menu-clicked", (event, { command, ...detail }) => {
  logger.log(`BACKEND EVENT: ${command}`, detail);
  emitEvent(`backend-${command.toLowerCase()}`, detail);
});

const last_save_action = {
  message: "",
};

window.addEventListener("backend-close", ({ detail }) => {
  if (last_save_action.message == "save") window.close();
  else if (window.confirm("Do you want to save changes?")) {
    last_save_action.message = "save";
    emitEvent("backend-save");
  }
});

window.addEventListener("app-save-end", ({ detail }) => {
  last_save_action.message = detail.message;
});
