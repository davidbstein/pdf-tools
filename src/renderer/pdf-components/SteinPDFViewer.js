import * as PDFJSViewer from "pdfjs-dist/web/pdf_viewer";
import fs from "fs";
import { getDocument } from "pdfjs-dist/webpack";

export default class SteinPDFViewer {
  constructor(fileLocation, container) {
    console.log(container);
    this._eventBus = new PDFJSViewer.EventBus();
    this._pdfViewer = new PDFJSViewer.PDFViewer({
      container: container,
      eventBus: this._eventBus,
    });
    getDocument(fs.readFileSync(fileLocation).buffer).promise.then(
      (doc) => this._pdfViewer.setDocument(doc),
      (error) => console.error(`Could not load ${this.props.url} ERROR: ${error}`)
    );
  }
}
