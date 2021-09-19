import React, { useState } from "react";
import { getCurrentPath, handleFileSelect, handleFolderSelect } from "@/actions";
import { listDir } from "@/fileHelpers";
import "file-icon-vectors/dist/file-icon-square-o.css";
import "@/css/browser.css";

export default function BrowserApp() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath());
  const [showHidden, setShowHidden] = useState(false);
  return (
    <div id="folder-broser">
      <div id="current-path">
        {currentPath.split("/").map((cur, idx, arr) => {
          const p = arr.slice(0, idx + 1).join("/");
          return [
            <span className="clickable" onClick={() => handleFolderSelect(setCurrentPath, p)}>
              {cur}
            </span>,
            <span>/ </span>,
          ];
        })}
      </div>
      <div id="file-list">
        {listDir(currentPath, showHidden).map((dirEnt) => {
          const target = `${currentPath}/${dirEnt.name}`;
          const type = dirEnt.isFile() ? dirEnt.name.split(".").pop() : "folder";
          const iconclass = `fiv-sqo fiv-icon-${type}`;
          return (
            <div
              key={dirEnt.name}
              className={`clickable file-link ${dirEnt.isFile() ? "file-name" : "folder-name"}`}
              onClick={
                dirEnt.isFile()
                  ? () => handleFileSelect(target)
                  : () => handleFolderSelect(setCurrentPath, target)
              }
            >
              <span className={iconclass}></span>
              <span className="dir-ent-name">{dirEnt.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}