import "@/css/main.scss";

import ReactDOM from "react-dom";
import React from "react";
import PdfViewer from "@/pdfViewer.js";
import BrowserApp from "./browserApp";
import { getCurrentPath } from "@/actions";
import _ from "lodash";

function getUrlParams() {
  const params = {};
  window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (str, key, value) {
    params[key] = decodeURIComponent(value);
  });
  console.log(`[renderer] URL Params: ${JSON.stringify(params)}`);
  return params;
}

function App() {
  const { filePath, fileType, windowId } = getUrlParams();
  window._WINDOW_ID = windowId;
  console.log(`[renderer] loading document: ${filePath}`);
  return (
    <div id="container">
      {fileType == "directory" ? <BrowserApp /> : <PdfViewer url={filePath} />}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("app"));

document.title = getCurrentPath();
window._WINDOW_ID = getUrlParams().windowId;
