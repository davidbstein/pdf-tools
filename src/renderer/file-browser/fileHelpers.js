import fs from "fs";
import _ from "lodash";
/**
 * if no file is being watches: begins watching filePath for updates using `fs.watchFile`
 * if the file being watches is not the same as filePath: reloads the page.
 * @param {String} filePath
 */
export function watchOrReload(filePath, reloadCallback) {
  if (window._CURRENT_WATCHED_FILE_PATH !== filePath) {
    if (window._CURRENT_WATCHED_FILE_PATH) fs.unwatchFile(window._CURRENT_WATCHED_FILE_PATH);
    window._CURRENT_WATCHED_FILE_PATH = filePath;
    fs.watch(filePath, (eventType) => {
      console.log(`update to ${filePath} -- ${eventType}`);
      reloadCallback();
    });
  }
}

export function listDir(path = "/Users/stein", hidden = false) {
  const content = fs
    .readdirSync(path, { withFileTypes: true })
    .filter((dirEnt) => hidden || dirEnt.name.slice(0, 1) != ".")
    .filter((dirEnt) => hidden || dirEnt.name.slice(0, 1) != "~")
    .map((dirEnt) => ({
      name: dirEnt.name,
      isFile: dirEnt.isFile(),
      isDirectory: dirEnt.isDirectory(),
      fileInfo: dirEnt.isFile() ? fs.statSync(`${path}/${dirEnt.name}`) : null,
    }));
  return _.sortBy(content, (dirEnt) => [
    // file or folder starts with _
    dirEnt.name.slice(0, 1) != "_",
    // folders first
    dirEnt.isFile,
    // then pdfs
    dirEnt.name.slice(-4) != ".pdf",
    dirEnt.name,
  ]);
}
