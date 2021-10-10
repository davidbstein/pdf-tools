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
      renderer: "svg" || "canvas",
      annotationMode: 0,
    });
    this._pdfViewer._buffer.resize(150);
    const fpath = path.parse(fileLocation);
    this._fileLocation = fileLocation;
    this._tempFileLocation = path.format({
      ...fpath,
      base: `~${fpath.name}(${/*new Date().toISOString()*/ "-"}).${fpath.ext}`,
    });
    // bind
    window._pdf = this;
    this.listenToScroll = _.debounce(this.listenToScroll, 500, { leading: false, trailing: true });
    this.autoSave = _.debounce(this.autoSave.bind(this), 3000, { leading: false, trailing: true });
    this._saveListener = this._saveListener.bind(this);

    // load
    this.listenToAnnotationRender(() => {
      console.log("[SteinPdfViewer] annotation layer rendered");
    });
    this._initialize();
  }

  async _initialize() {
    fs.copyFile(this._fileLocation, this._tempFileLocation, () => {});
    const filebuffer = fs.readFileSync(this._fileLocation).buffer;
    this._highlightManager = new HighlightManager(this);
    await this._highlightManager._initializeDocument(filebuffer);
    const doc = await getDocument(await this._highlightManager.getPDFBytes()).promise;
    this._doc = doc;
    this._pdfViewer.setDocument(doc);
    const tempRAL = PDFJSViewer.PDFPageView.prototype._renderAnnotationLayer;
    PDFJSViewer.PDFPageView.prototype._renderAnnotationLayer = function () {
      console.log("[SteinPdfViewer] annotate");
    };
    document.addEventListener("keypress", this._saveListener);
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

  listenToAnnotationRender(callback) {
    this._eventBus.on("annotationlayerrendered", callback);
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
