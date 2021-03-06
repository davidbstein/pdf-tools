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
      }

    // debouncers
    const _debounceSettings = { leading: false, trailing: true };
    this.autoSave = _.debounce(this.autoSave, 3000, { leading: true, trailing: true });
    this.saveFileAndAnnotations = _.debounce(this.saveFileAndAnnotations, 100, _debounceSettings);

    this.pdfjsEventBus.on("annotationlayerrendered", () => {
      logger.info("annot layer rendered");
      this._initialize_search();
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

  _initialize_search() {
    if (this.findController != undefined) return;
    this.linkService = this.pdfViewer.linkService;
    this.findController = new PDFJSViewer.PDFFindController({
      linkService: this.linkService,
      eventBus: this.pdfjsEventBus,
    });
    this.findController.setDocument(this.pdfViewer.pdfDocument);
    this.pdfViewer.findController = this.findController;
    logger.log(this.findController);
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
    this.updateOutline();
    return this.highlightManager;
  }

  async _initialize_listeners() {
    this.pdfjsEventBus.on("updateviewarea", (evt) => {
      logger.info("update view area");
    });
    window.addEventListener("highlight-manager-loaded", this._startHighlightManagerControllers);
    this._startUIEventListeners();
    this._startUIEventNotifiers();
  }

  /**
   * listens for notifications triggered by UI events, notified the pdf management stuff
   */
  _startUIEventListeners() {
    const _listen = window.addEventListener;
    _listen("app-viewer-resize", (event) =>
      this.pdfjsEventBus.dispatch("resize", { source: this.containerDOMElement })
    );
    _listen("app-set-zoom", (e) => this.setScale(e.detail));
    _listen("app-set-page", (e) => this.setPage(e.detail));
    _listen("app-outline-add-item", (e) => this.doOutlineAddItem(e.detail));
    _listen("app-outline-remove-item", (e) => this.doOutlineRemoveItem(e.detail));
    _listen("app-outline-change-item-depth", (e) => this.doOutlineChangeItemDepth(e.detail));
    _listen("app-change-annotation-mode", (e) => {});
    _listen("app-set-highlight-render-layer", (e) => this.setHighlightRenderLayer(e.detail));
    _listen("app-page-focus", (e) => this.updateFocus(e.detail));
  }

  /**
   * listens to changes to the pdf, notifies the React part of the UI.
   */
  _startUIEventNotifiers() {
    this.pdfjsEventBus.on("pagechanging", this.updateCurrentPageUI);
    this.pdfjsEventBus.on("scalechanging", this.updateCurrentScaleUI);
    window.addEventListener("pdf-outline-changed", this.updateOutline);
    this.pdfjsEventBus.on("pagesloaded", this._loadViewstate);
  }

  /**
   * listens for notifications sent by the pdf backend and notifies the highlight manager
   */
  _startHighlightManagerControllers() {
    logger.log("highligh manager loaded! adding listeners...");
    this.pdfjsEventBus.on("pagerendered", this.highlightManager.handlePageRendered);
    this.pdfjsEventBus.on("pagechanging", this.highlightManager.handlePageChanging);
    window.addEventListener("pdf-selection-made", this.highlightManager.handleSelectionMade);
    window.addEventListener("backend-undo", this.highlightManager.undo);
    window.addEventListener("backend-redo", this.highlightManager.redo);
  }

  ///////////////////////
  // UI event handlers //
  ///////////////////////

  async redrawPage(pageIdx) {
    const page = await this.pdfViewer.getPageView(pageIdx);
    page.reset();
    this.pdfViewer.update();
    return page;
  }

  setScale(scale) {
    logger.log("debug", `setting scale to ${scale}`);
    this.pdfViewer._setScale(scale);
  }

  setPage(pageIdx) {
    this.pdfViewer.currentPageNumber = pageIdx + 1;
  }

  setHighlightRenderLayer({ highlightRenderLayer }) {
    this.reactComponent.setState({
      highlightRenderLayer,
    });
  }

  goToDestinationPage(pageIdx) {
    this.pdfViewer.currentPageNumber = pageIdx + 1;
  }

  updateCurrentScaleUI(event) {
    this.reactComponent.setState({ scale: event.scale });
  }

  updateCurrentPageUI(event) {
    const { first, last } = this.pdfViewer._getVisiblePages();
    const outline = this.highlightManager.docProxy.listOutlines()[0];
    const outlinePath = outlineToBreadcrumb(outline, first.id);
    this.reactComponent.setState({
      pageNumber: event.pageNumber,
      pageLabel: event.pageLabel,
      firstPageIdx: first.id,
      lastPageIdx: last.id,
      // previous: event.previous,
      outlinePath,
    });
    logger.log(`update page to $${event.pageNumber}. New outline: ${outlinePath.join(">")}`);
  }

  updateFocus({ pageNumber, activeHighlights }) {
    const outline = this.highlightManager.docProxy.listOutlines()[0];
    const outlinePath = outlineToBreadcrumb(outline, pageNumber - 1);
    this.reactComponent.setState({ pageNumber, outlinePath, activeHighlights });
  }

  updateOutline() {
    this.reactComponent.setState({
      outlineRoots: this.highlightManager.docProxy.listSerializableOutlines(),
    });
  }

  ////////////////////////
  // State Manipulation //
  ////////////////////////
  doOutlineAddItem({ title, pageIdx, depth_delta }) {
    if (!title) return;
    this.highlightManager.addOutlineItem(title, pageIdx, depth_delta);
  }

  doOutlineRemoveItem({ title, pageIdx }) {
    this.highlightManager.removeOutlineItem(title, pageIdx);
  }

  doOutlineChangeItemDepth({ title, pageIdx, direction }) {
    this.highlightManager.changeOutlineItemDepth(title, pageIdx, direction);
  }

  ///////////////////////
  // File IO functions //
  ///////////////////////

  _saveViewstate() {
    logger.debug("saving viewstate!", this.reactComponent.state);
    this.highlightManager.docProxy.setCustomViewInfo("viewState", this.reactComponent.state);
  }

  _loadViewstate() {
    if (this._viewStateLoaded != undefined) return;
    this._viewStateLoaded = true;
    const viewState = this.highlightManager.docProxy.getCustomViewInfo().viewState;
    logger.debug("loading viewstate!", viewState);
    const {
      scale,
      firstPageIdx,
      sidebar_width,
      statusbar_height,
      toolbar_height,
      annotationbar_width,
      highlightRenderLayer,
    } = viewState;
    if (sidebar_width) this.reactComponent.setState({ sidebar_width });
    if (statusbar_height) this.reactComponent.setState({ statusbar_height });
    if (toolbar_height) this.reactComponent.setState({ toolbar_height });
    if (annotationbar_width) this.reactComponent.setState({ annotationbar_width });
    if (highlightRenderLayer) this.reactComponent.setState({ highlightRenderLayer });
    if (scale) this.setScale(scale);
    if (firstPageIdx) this.setPage(firstPageIdx);
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
    this._saveViewstate();
    const saveLoc = `${this._fileLocation}`;
    this._save(saveLoc, "save", () => {
      setIsSaved(true);
    });
  }
}
