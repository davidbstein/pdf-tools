import pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import PdfjsWorker from "worker-loader?esModule=false&filename=[name].[contenthash].js!pdfjs-dist/legacy/build/pdf.worker.js";

if (typeof window !== "undefined" && "Worker" in window) {
  pdfjs.GlobalWorkerOptions.workerPort = new PdfjsWorker();
}

module.exports = pdfjs;
