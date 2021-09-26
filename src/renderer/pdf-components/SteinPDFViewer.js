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
    this._fileLocation = fileLocation;

    // bind
    window._pdf = this;
    this.listenToScroll = _.debounce(this.listenToScroll, 500, { leading: false, trailing: true });
    this._saveListener = this._saveListener.bind(this);

    // load
    getDocument(fs.readFileSync(fileLocation).buffer).promise.then(
      (doc) => {
        this._pdfViewer.setDocument(doc);
        this._doc = doc;
        this._highlightManager = new HighlightManager(this);
        document.addEventListener("keypress", this._saveListener);
      },
      (error) => console.error(`Could not load ${fileLocation} ERROR: ${error}`)
    );
  }

  getOutline(callback) {
    this._doc.getOutline().then(callback);
  }

  goToDestinationPage(destination) {
    this._doc.getPageIndex(destination).then((pageIndex) => {
      this._pdfViewer.currentPageNumber = pageIndex + 1;
    });
  }

  lookupDestinationPage(destination, callback) {
    this._doc
      .getPageIndex(destination)
      .then((pageIndex) => callback(pageIndex + 1))
      .catch((error) => console.log(`no pagenum for ${JSON.stringify(destination)}`));
  }

  listenToPageRender(callback) {
    this._eventBus.on("pagerendered", callback);
  }

  listenToScroll(callback) {
    this._eventBus.on("updateviewarea", callback);
  }

  saveFileAndAnnotations() {
    const f = this._highlightManager.getRawPDFWithAnnotations();
    fs.writeFileSync(`${this._fileLocation}.highlightest.pdf`, f);
  }

  _saveListener(e) {
    if (e.key === "s" && e.ctrlKey) {
      this.saveFileAndAnnotations();
    }
  }
}
