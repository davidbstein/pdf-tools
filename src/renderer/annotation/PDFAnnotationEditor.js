import _ from "lodash";
import { getDocument } from "pdfjs-dist/webpack";
import { Logger, emitEvent } from "@/helpers";
import * as PDFJSViewer from "pdfjs-dist/web/pdf_viewer";
import fs from "fs";
import HighlightManager from "@/annotation/HighlightManager";
import path from "path";
const logger = new Logger("PDFAnnotationEditor", { debug: true });

export default class PDFAnnotationEditor {
  constructor(fileLocation, container, reactComponent) {
    // DOCUMENT LOADER
    this.containerDOMElement = container;
    this.reactComponent = reactComponent;
    this.pdfjsEventBus = new PDFJSViewer.EventBus();
    // see https://github.com/mozilla/pdf.js/blob/master/src/display/api.js for parameters
    this.pdfViewer = new PDFJSViewer.PDFViewer({
      container: container,
      eventBus: this.pdfjsEventBus,
      renderer: "svg" || "canvas",
      annotationMode: 0,
    });
    this.pdfViewer._buffer.resize(150);
    const fpath = path.parse(fileLocation);
    this._fileLocation = fileLocation;
    this._tempFileLocation = path.format({
      ...fpath,
      base: `.~${fpath.name}(${/*new Date().toISOString()*/ "-"}).${fpath.ext}`,
    });

    // global refs
    window._pdf = this;
    window.PDFAnnotationEditor = this;

    // bind
    for (let _method of Object.getOwnPropertyNames(this.__proto__))
      this[_method] = _method != "constructor" ? this[_method]?.bind(this) : 0;

    // debouncers
    const _debounceSettings = { leading: false, trailing: true };
    this.autoSave = _.debounce(this.autoSave, 3000, _debounceSettings);
    this.saveFileAndAnnotations = _.debounce(this.saveFileAndAnnotations, 100, _debounceSettings);

    // load
    this.pdfjsEventBus.on("annotationlayerrendered", () => {
      logger.log("annot layer rendered");
    });
    this._initialize();
  }

  get _eventBus() {
    logger.warn("TODO: KILL THIS REFERENCE");
    this.pdfjsEventBus;
  }

  get _pdfViewer() {
    logger.warn("TODO: KILL THIS REFERENCE");
    return this.pdfViewer;
  }

  async _initialize() {
    const documentFilebuffer = await this._initialize_document();
    await this._initialize_annotation_manager(documentFilebuffer);
    await this._initialize_listeners();
  }

  async _initialize_document() {
    const fileLastModified = fs.statSync(this._fileLocation).mtime;
    const backupExists = fs.existsSync(this._tempFileLocation);
    let restore = false;
    if (backupExists) {
      const backupLastModified = backupExists && fs.statSync(this._tempFileLocation).mtime;
      if (backupLastModified > fileLastModified)
        restore = confirm(`Backup exists for ${path.parse(this._fileLocation).base}. Recover?`);
    }
    const readTarget = restore ? this._tempFileLocation : this._fileLocation;
    const filebuffer = fs.readFileSync(readTarget).buffer;
    return filebuffer;
  }

  async _initialize_annotation_manager(filebuffer) {
    this.highlightManager = new HighlightManager(this);
    await this.highlightManager._initializeDocument(filebuffer);
    // see https://github.com/mozilla/pdf.js/blob/master/src/display/api.js for parameters
    const doc = await getDocument({
      data: await this.highlightManager.getPDFBytes(),
      verbosity: 0,
    }).promise;
    this.doc = doc;
    this.pdfViewer.setDocument(doc);
    const tempRAL = PDFJSViewer.PDFPageView.prototype._renderAnnotationLayer;
    PDFJSViewer.PDFPageView.prototype._renderAnnotationLayer = function () {
      logger.log("annotate");
    };
    document.addEventListener("keypress", this._saveListener);
    window.addEventListener("backend-save", this.saveFileAndAnnotations);
    return this.highlightManager;
  }

  async _initialize_listeners() {
    this.pdfjsEventBus.on("updateviewarea", (evt) => {
      logger.log("update view area");
    });

    window.addEventListener("highligh-manager-loaded", () => {
      logger.log("highligh manager loaded! adding listeners...");
      this.pdfjsEventBus.on("pagerendered", this.highlightManager.handlePageRendered);
      this.pdfjsEventBus.on("pagechanging", this.highlightManager.handlePageChanging);
      window.addEventListener("pdf-selection-made", this.highlightManager.processCurrentSelection);
      window.addEventListener("backend-undo", this.highlightManager.undo);
      window.addEventListener("backend-redo", this.highlightManager.redo);
    });
  }
  async redrawPage(pageIdx) {
    const page = await this.pdfViewer.getPageView(pageIdx);
    page.reset();
    this.pdfViewer.update();
    return page;
  }

  getOutline(callback) {
    this.doc.getOutline().then(callback);
  }

  goToDestinationPage(pageIdx) {
    this.pdfViewer.currentPageNumber = pageIdx + 1;
  }

  lookupDestinationPage(destination, callback) {
    this.doc
      .getPageIndex(destination)
      .then((pageIndex) => callback(pageIndex + 1))
      .catch((error) => logger.log(`no pagenum for ${JSON.stringify(destination)}`));
  }

  async _save(location, message = "saving") {
    const saveLoc = `${location}`;
    logger.log(`[SteinPdfViewer] (start) ${message} - ${saveLoc}`);
    emitEvent("app-save-start", { message });
    const f = await this.highlightManager.getPDFBytes({
      filename: saveLoc.split("/").pop(),
    });
    fs.writeFileSync(saveLoc, f);
    emitEvent("app-save-end", { message });
    logger.log(`[SteinPdfViewer] (done) ${message} - ${saveLoc}`);
  }

  async autoSave() {
    const saveLoc = `${this._tempFileLocation}`;
    this._save(saveLoc, "auto-save");
  }

  async saveFileAndAnnotations() {
    const saveLoc = `${this._fileLocation}`;
    this._save(saveLoc, "save");
  }
}
