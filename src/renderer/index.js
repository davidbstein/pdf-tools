import "@/css/reset.css";
import "@/css/main.css";

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
  console.log(params);
  return params;
}

function App() {
  const filePath = getUrlParams().filePath;
  console.log(`loading ${filePath}`);
  return <div id="container">{filePath ? <PdfViewer url={filePath} /> : <BrowserApp />}</div>;
}

ReactDOM.render(<App />, document.getElementById("app"));

document.title = getCurrentPath();
window._WINDOW_ID = getUrlParams().windowId;
