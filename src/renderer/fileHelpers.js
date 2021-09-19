import fs from "fs";

export function listDir(path = "/Users/stein", hidden = false) {
  const content = fs
    .readdirSync(path, { withFileTypes: true })
    .filter((dirEnt) => hidden || dirEnt.name.slice(0, 1) != ".")
    .filter((dirEnt) => hidden || dirEnt.name.slice(0, 1) != "~");
  return _.sortBy(content, (dirEnt) => [
    // file or folder starts with _
    dirEnt.name.slice(0, 1) != "_",
    // folders first
    dirEnt.isFile(),
    // then pdfs
    dirEnt.name.slice(-4) != ".pdf",
    dirEnt.name,
  ]);
}
