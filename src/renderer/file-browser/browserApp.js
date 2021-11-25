import React, { useState, useReducer } from "react";
import { getCurrentPath, handleFileSelect, handleFolderSelect } from "@/actions";
import { listDir, watchOrReload } from "@/file-browser/fileHelpers";
import "file-icon-vectors/dist/file-icon-square-o.css";
import "@/css/browser.scss";
import { shell } from "electron";

/**
 * given a date object. Return a string either showing:
 * - "just now" if the date is less than a minute ago
 * - "x minutes ago" if the date is less than an hour ago
 * - "HH:MM ago" if the date is less than a day ago
 * - "mm-dd HH:MM" if the date is less than six months ago
 * - "YYYY-mm-dd HH:MM" if the date is less than six months ago
 * @param {} date
 */
function ageString(date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) {
    return "just now";
  } else if (diff < 3600000) {
    return Math.floor(diff / 60000) + " minutes ago";
  } else if (diff < 86400000) {
    return Math.floor(diff / 3600000) + " hours ago";
  } else if (diff < 2629746000) {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  } else {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  }
}

export default function BrowserApp() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath());
  const [showHidden, setShowHidden] = useState(false);
  const [_, forceUpdate] = useReducer((x) => x + 1, 0);
  watchOrReload(currentPath, forceUpdate);
  return (
    <div id="folder-broser">
      <div id="current-path">
        {currentPath.split("/").map((cur, idx, arr) => {
          const p = arr.slice(0, idx + 1).join("/");
          return (
            <span key={idx}>
              <span className="clickable" onClick={() => handleFolderSelect(setCurrentPath, p)}>
                {cur}
              </span>
              <span>/ </span>
            </span>
          );
        })}
      </div>
      <div id="file-list">
        {listDir(currentPath, showHidden).map((dirEnt) => {
          const target = `${currentPath}/${dirEnt.name}`;
          const type = dirEnt.isFile ? dirEnt.name.split(".").pop() : "folder";
          const iconclass = `fiv-sqo fiv-icon-${type}`;
          return (
            <div
              key={dirEnt.name}
              className={`clickable file-link ${dirEnt.isFile ? "file-name" : "folder-name"}`}
              onClick={
                dirEnt.isFile
                  ? () => handleFileSelect(target)
                  : () => {
                      handleFolderSelect(setCurrentPath, target);
                      history.pushState({ target, currentPath }, "");
                    }
              }
              onContextMenu={(e) => {
                console.log(e);
                shell.showItemInFolder(target);
              }}
            >
              <span>
                <span className={iconclass}></span>
                <span className="dir-ent-name">{dirEnt.name}</span>
              </span>
              <span className="dir-ent-modified">{`${
                dirEnt.fileInfo ? ageString(dirEnt.fileInfo.mtime) : ""
              }`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
