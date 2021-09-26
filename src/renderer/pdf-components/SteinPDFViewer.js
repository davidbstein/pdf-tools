import * as PDFJSViewer from "pdfjs-dist/web/pdf_viewer";
import fs from "fs";
import { getDocument } from "pdfjs-dist/webpack";
import _ from "lodash";
import HighlightManager from "@/pdf-components/annotationTools";

export default class SteinPDFViewer {
  constructor(fileLocation, container) {
    // DOCUMENT LOADER
    console.log(container);
    this._container = container;
    this._eventBus = new PDFJSViewer.EventBus();
    this._pdfViewer = new PDFJSViewer.PDFViewer({
      container: container,
      eventBus: this._eventBus,
    });

    getDocument(fs.readFileSync(fileLocation).buffer).promise.then(
      (doc) => {
        this._pdfViewer.setDocument(doc);
        this._doc = doc;
        this._highlightManager = new HighlightManager(this);
      },
      (error) => console.error(`Could not load ${this.props.url} ERROR: ${error}`)
    );

    // this._eventBus.on("pagerendered", (e) => {
    //   console.log("rendered", e);
    // });
  }

  getOutline(callback) {
    this._doc.getOutline().then(callback);
  }

  goToDestinationPage(destination) {
    this._doc.getPageIndex(destination).then((pageIndex) => {
      this._pdfViewer.currentPageNumber = pageIndex + 1;
    });
  }
}
