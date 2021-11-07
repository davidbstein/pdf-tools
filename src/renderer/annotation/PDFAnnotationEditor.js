/**
 * this is the primary controller for the application. It is responsible for making state changes to the pdfViewer and the HighlightManager.
 */

import _ from "lodash";
import { getDocument } from "pdfjs-dist/webpack";
import { Logger, emitEvent } from "@/helpers";
import * as PDFJSViewer from "pdfjs-dist/web/pdf_viewer";
import fs from "fs";
import HighlightManager from "@/annotation/HighlightManager";
import path from "path";
import { setIsSaved } from "../actions";
import { outlineToBreadcrumb } from "@/annotation/annotationHelpers/outlineManagement";
const logger = new Logger("PDFAnnotationEditor", { debug: true });

function bufferFile(path) {
  const stats = fs.statSync(path);
  const fd = fs.openSync(path, "r");
  const buffer = new Buffer.alloc(stats.size);
  fs.read(fd, { buffer }, (error, bytesRead, buffer) => {
    logger.log(`load progress: ${bytesRead} ${stats.size}`);
  });
  buffer.onProgress = (progress) => {
    logger.log(`parse progress: ${progress}`);
  };
  logger.log("buffer loaded...");
  return buffer;
}

export default class PDFAnnotationEditor {
  constructor(fileLocation, container, reactComponent) {
    // DOCUMENT LOADER
    this.containerDOMElement = container;
    this.reactComponent = reactComponent;
    this.pdfjsEventBus = new PDFJSViewer.EventBus();
    // see https://github.com/mozil la/pdf.js/blob/master/src/display/api.js for parameters
    this.pdfViewer = new PDFJSViewer.PDFViewer({
      container,
      eventBus: this.pdfjsEventBus,
      renderer: "svg" || "canvas",
      annotationMode: 0,
    });
    this.pdfViewer._buffer.resize(500);
    const fpath = path.parse(fileLocation);
    this._fileLocation = fileLocation;
    const tempFileName = `.~${fpath.name}(${/*new Date().toISOString()*/ "-"}).${fpath.ext}`;
    this._tempFileLocation = path.format({ ...fpath, base: tempFileName });

    // global refs
    window._pdf = this;
    window.PDFAnnotationEditor = this;

    // bind all methods to current scope.
    const descriptors = Object.getOwnPropertyDescriptors(this.__proto__);
    for (let _method in descriptors)
      if (typeof descriptors[_method].value === "function" && _method !== "constructor") {
        this[_method] = this[_method]?.bind(this);
        logger.log(_method);
      }

    // debouncers
    const _debounceSettings = { leading: false, trailing: true };
    this.autoSave = _.debounce(this.autoSave, 3000, { leading: true, trailing: true });
    this.saveFileAndAnnotations = _.debounce(this.saveFileAndAnnotations, 100, _debounceSettings);

    this.pdfjsEventBus.on("annotationlayerrendered", () => {
      logger.info("annot layer rendered");
    });
    this._initialize();
  }

  /**
   * handles order of operations for loading the PDF and starting the annotation manager
   */
  async _initialize() {
    logger.log("initializing...");
    await this._initialize_listeners();
    const readTarget = await this._initialize_document();
    //const filebuffer = fs.readFileSync(readTarget).buffer;
    //await this._initialize_annotation_manager(filebuffer);
    await this._initialize_annotation_manager(readTarget);
  }

  /**
   * loads the pdf file into a filebuffer
   */
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
    return readTarget;
  }

  /**
   * loads the pdf UI from a filebuffer
   */
  async _initialize_annotation_manager(readTarget) {
    logger.log("document initialized");
    this.highlightManager = new HighlightManager(this);
    const buffer1 = bufferFile(readTarget);
    logger.log("reading pdf...");
    const annotationLoadingTask = await this.highlightManager._initializeDocument(buffer1);
    // see https://github.com/mozilla/pdf.js/blob/master/src/display/api.js for parameters
    logger.log("starting render task");
    const loadingTask = getDocument({
      data: await this.highlightManager.getPDFBytes(),
      //data: this.highlightManager.streamPDFBytes(),
      verbosity: 0,
    });
    loadingTask.onProgress = (progressData) => {
      logger.info(`loading progress: ${progressData.loaded}/${progressData.total}`);
    };
    const doc = await loadingTask.promise;
    this.doc = doc;
    this.pdfViewer.setDocument(doc);
    const tempRAL = PDFJSViewer.PDFPageView.prototype._renderAnnotationLayer;
    // PDFJSViewer.PDFPageView.prototype._renderAnnotationLayer = function () {
    //   logger.log("annotate");
    // };
    document.addEventListener("keypress", this._saveListener);
    window.addEventListener("backend-save", this.saveFileAndAnnotations);
    return this.highlightManager;
  }

  async _initialize_listeners() {
    this.pdfjsEventBus.on("updateviewarea", (evt) => {
      logger.info("update view area");
    });

    this._startHighlightManagerControllers();
    this._startUIEventListeners();
    this._startUIEventNotifiers();
  }

  /**
   * listens for notifications triggered by UI events, notified the pdf management stuff
   */
  _startUIEventListeners() {
    window.addEventListener("app-set-zoom", () => {});
    window.addEventListener("app-set-page", () => {});
    window.addEventListener("app-change-outline", () => {});
    window.addEventListener("app-change-annotation-mode", () => {});
  }

  /**
   * listens to changes to the pdf, notifies the React part of the UI.
   */
  _startUIEventNotifiers() {
    this.pdfjsEventBus.on("pagechanging", this.updateCurrentPageUI);
    this.pdfjsEventBus.on("scalechanging", this.checkCurrentScale);
    window.addEventListener("pdf-outline-changed", this.updateOutline);
  }

  /**
   * listens for notifications sent by the pdf backend and notifies the highlight manager
   */
  _startHighlightManagerControllers() {
    window.addEventListener("highlight-manager-loaded", () => {
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

  goToDestinationPage(pageIdx) {
    this.pdfViewer.currentPageNumber = pageIdx + 1;
  }

  lookupDestinationPage(destination, callback) {
    this.doc
      .getPageIndex(destination)
      .then((pageIndex) => callback(pageIndex + 1))
      .catch((error) => logger.log(`no pagenum for ${JSON.stringify(destination)}`));
  }

  updateCurrentPageUI(event) {
    const { first, last } = this.pdfViewer._getVisiblePages();
    const outline = this.highlightManager.docProxy.listOutlines()[0];
    const path = outlineToBreadcrumb(outline, first.id);
    this.reactComponent.setCurrentPage({
      pageNumber: event.pageNumber,
      pageLabel: event.pageLabel,
      firstPageIdx: first.id,
      lastPageIdx: last.id,
      // previous: event.previous,
      outlinePath: path,
    });
    logger.log(`update page to $${event.pageNumber}. New outline: ${path.join(">")}`);
  }

  async _save(location, message = "saving", callback = () => {}) {
    const saveLoc = `${location}`;
    logger.log(`[SteinPdfViewer] (start) ${message} - ${saveLoc}`);
    emitEvent("app-save-start", { message });
    const f = await this.highlightManager.getPDFBytes({
      filename: saveLoc.split("/").pop(),
    });
    fs.writeFileSync(saveLoc, f);
    emitEvent("app-save-end", { message });
    logger.log(`[SteinPdfViewer] (done) ${message} - ${saveLoc}`);
    callback();
  }

  async autoSave() {
    const saveLoc = `${this._tempFileLocation}`;
    setIsSaved(false);
    this._save(saveLoc, "auto-save");
  }

  async saveFileAndAnnotations() {
    const saveLoc = `${this._fileLocation}`;
    this._save(saveLoc, "save", () => {
      setIsSaved(true);
    });
  }
}
