import "@/renderer";
import "pdfjs-dist/webpack";
import { ipcRenderer } from "electron";
import Logger from "@/helpers";

//const log = console.log;
const logger = new Logger("@/index.js", "orange");

ipcRenderer.on("menu-clicked", (event, { command, ...detail }) => {
  logger.log(`BACKEND EVENT: ${command}`, detail);
  window.dispatchEvent(new CustomEvent(`backend-${command.toLowerCase()}`, { detail }));
});
