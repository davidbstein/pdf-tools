import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Document, Page } from "react-pdf/dist/esm/entry.webpack";
import fs from "fs";
import "./reset.css";
import "./main.css";
import "file-icon-vectors/dist/file-icon-square-o.css";
import _ from "lodash";
import { ipcRenderer } from "electron";
import PdfViewer from "./pdfViewer.js";
// import pdfJsLib from "pdfjs-dist";
// pdfJsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.js";

// const loadingTask = pdfjsLib.getDocument(pdfPath);
// loadingTask.promise
// .then(function (pdfDocument) {
//   // Request a first page
//   return pdfDocument.getPage(1).then(function (pdfPage) {
//     // Display page on the existing canvas with 100% scale.
//     const viewport = pdfPage.getViewport({ scale: 1.0 });
//     const canvas = document.getElementById("theCanvas");
//     canvas.width = viewport.width;
//     canvas.height = viewport.height;
//     const ctx = canvas.getContext("2d");
//     const renderTask = pdfPage.render({
//       canvasContext: ctx,
//       viewport,
//     });
//     return renderTask.promise;
//   });
// })
// .catch(function (reason) {
//   console.error("Error: " + reason);
// });

function getUrlParams() {
  const params = {};
  window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (str, key, value) {
    params[key] = decodeURIComponent(value);
  });
  console.log(params);

  return params;
}

function listDir(path = "/Users/stein", hidden = false) {
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

function getCurrentPath() {
  return ipcRenderer.sendSync("getCurrentPath");
}

function listCurrentDir(hidden = false) {
  return listDir(getCurrentPath(), hidden);
}

function handleFolderSelect(setCurrentPath, target) {
  console.log("navigate", target);
  ipcRenderer.sendSync("navigateTo", target);
  const curPath = getCurrentPath();
  document.title = curPath;
  setCurrentPath(curPath);
}

function handleFileSelect(target) {
  console.log("opening", target);
  ipcRenderer.sendSync("openFile", target);
}

function PdfApp({ filePath }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div>
      <Document file={fs.readFileSync(filePath).data} onLoadSuccess={onDocumentLoadSuccess}>
        <Page pageNumber={pageNumber} />
      </Document>
      <p>
        Page {pageNumber} of {numPages}
      </p>
      <div></div>
    </div>
  );
}

function BrowserApp() {
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

function App() {
  const filePath = getUrlParams().filePath;
  console.log(`loading ${filePath}`);
  return <div id="container">{filePath ? <PdfViewer url={filePath} /> : <BrowserApp />}</div>;
}

ReactDOM.render(<App />, document.getElementById("app"));
document.title = getCurrentPath();
