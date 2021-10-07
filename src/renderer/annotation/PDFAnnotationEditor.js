import * as PDFJSViewer from "pdfjs-dist/web/pdf_viewer";
import fs from "fs";
import { getDocument } from "pdfjs-dist/webpack";
import _ from "lodash";
import HighlightManager from "@/annotation/HighlightManager";
import path from "path";

export default class PDFAnnotationEditor {
  constructor(fileLocation, container) {
    // DOCUMENT LOADER
    this._container = container;
    this._eventBus = new PDFJSViewer.EventBus();
    this._pdfViewer = new PDFJSViewer.PDFViewer({
      container: container,
      eventBus: this._eventBus,
      renderer: "svg",
    });
    const fpath = path.parse(fileLocation);
    this._fileLocation = fileLocation;
    this._tempFileLocation = path.format({
      ...fpath,
      base: `~${fpath.name}(${new Date().toISOString()}).${fpath.ext}`,
    });

    // bind
    window._pdf = this;
    this.listenToScroll = _.debounce(this.listenToScroll, 500, { leading: false, trailing: true });
    this.autoSave = _.debounce(this.autoSave.bind(this), 3000, { leading: false, trailing: true });
    this._saveListener = this._saveListener.bind(this);

    // load
    console.log("test");
    fs.copyFileSync(fileLocation, this._tempFileLocation);
    getDocument(fs.readFileSync(this._tempFileLocation).buffer).promise.then(
      (doc) => {
        this._pdfViewer.setDocument(doc);
        this._doc = doc;
        this._highlightManager = new HighlightManager(this);
        document.addEventListener("keypress", this._saveListener);
      },
      (error) => console.error(`Could not load ${fileLocation} ERROR: ${error}`)
    );
  }

  async redrawPage(pageIdx) {
    const page = await this._pdfViewer.getPageView(pageIdx);
    page.reset();
    this._pdfViewer.update();
    return page;
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

  listenToPageChange(callback) {
    this._eventBus.on("pagechanging", callback);
  }

  listenToScroll(callback) {
    this._eventBus.on("updateviewarea", callback);
  }

  async autoSave() {
    const saveLoc = `${this._tempFileLocation}`;
    console.log(`[SteinPdfViewer] autoSAVING - ${saveLoc}`);
    const f = await this._highlightManager.getPDFBytes({
      filename: saveLoc.split("/").pop(),
    });
    fs.writeFileSync(saveLoc, f);
    console.log(`[SteinPdfViewer] autoSAVED - ${saveLoc}`);
  }

  async saveFileAndAnnotations() {
    const saveLoc = `${this._fileLocation}`;
    console.log(`[SteinPdfViewer] SAVING - ${saveLoc}`);
    const f = await this._highlightManager.getPDFBytes({
      filename: saveLoc.split("/").pop(),
    });
    fs.writeFileSync(saveLoc, f);
    console.log(`[SteinPdfViewer] SAVED - ${saveLoc}`);
  }

  _saveListener(e) {
    if (e.key === "s" && e.ctrlKey) {
      this.saveFileAndAnnotations();
    }
  }
}
