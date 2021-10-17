import _ from "lodash";
import {
  currentSelection,
  colorToHex,
  colorToRGB,
  annotationToDivs,
  getSelectionPageNumber,
} from "@/annotation/AnnotationHelpers";
import { ToolList, ToolTypes } from "@/annotation/AnnotationTypes";
import { DOMSVGFactory } from "pdfjs-dist/legacy/build/pdf.js";
import DocProxy from "@/annotation/DocProxy";
import { testOutlineWriter, testAnnotation } from "@/tests/highlightManagerTests";
import { Logger, emitEvent } from "@/helpers";
import { ToolCategories } from "./AnnotationTypes";

//const log = console.log;
const logger = new Logger("HighlightManager", "green");

const DEFAULTS = {
  clearSelection: true,
  tool: ToolList[0],
};

function runTests(hm) {
  window.hm = hm;
  window.d = hm.docProxy;
  //testOutlineWriter(this);
  //testAnnotation(hm);
}

export default class HighlightManager {
  constructor(pdfViewer) {
    if (window.HighlightManager) return;
    else window.HighlightManager = this;

    for (let _method of Object.getOwnPropertyNames(this.__proto__))
      this[_method] = _method != "constructor" ? this[_method]?.bind(this) : 0;

    //instance internals
    _.debounce(this._doMarkupSelection, 100, { trailing: true });
    this._pdf = pdfViewer;
    this._pendingSelectionChange = false;
    this.highlightDivs = {};
    this.annotationMap = {};
    this.undoQueue = [];
    this.redoQueue = [];
    this.visiblePages = [];
    // settings and defaults
    this.clearSelection = DEFAULTS.clearSelection;
    this.setCurrentTool(DEFAULTS.tool);
  }

  async _initializeDocument(data) {
    const container = this._pdf._container;
    this.docProxy = await DocProxy.createDocProxy(data);
    window.addEventListener("pdf-selection-made", this._processSelectionComplete);
    window.addEventListener("backend-undo", this._processUndo);
    this._pdf.listenToPageRender(this._detectPageRender);
    this._pdf.listenToPageChange(this._detectPageChange);
    console.warn("%cYOU MUST DELETE THIS IT'S FOR TESTING", "color: red", runTests(this));
  }

  _initStyleTag() {
    if (!this.styleTag) {
      this.styleTag = document.createElement("style");
      this.styleTag.type = "text/css";
      document.head.appendChild(this.styleTag);
    }
    return this.styleTag;
  }

  _doMarkupSelection(selection) {
    const action = this.docProxy.createHighlight({ ...selection, ...this.currentTool });
    action.redoFn();
    this.undoQueue.push(action);
    this.redoQueue = [];
    this.clearSelection ? document.getSelection().removeAllRanges() : null;
    this._pdf.autoSave();
    this._drawPage(action.params.pageIdx);
  }

  _doEditSelection(selection) {
    if (this.currentTool.type == ToolTypes.OUTLINE) {
      emitEvent("outline-edit", {
        text: selection.text,
        pageNumber: selection.pageNumber,
        pageIdx: selection.pageIdx,
      });
    }
  }

  _detectPageRender({ pageNumber, ...rest }) {
    //logger.log("page render", pageNumber, rest);
    this._updatePages();
    this._drawPage(pageNumber - 1);
  }

  _detectPageChange({ pageNumber, previous, ...rest }) {
    logger.log(`current page: ${pageNumber}, last page: ${previous}`);
    this._updatePages();
  }

  _updatePages() {
    const visiblePages = _pdf._pdfViewer
      ._getVisiblePages()
      .views.map((pageView) => pageView.view.pdfPage._pageIndex);
    const remaining = _.intersection(this.visiblePages, visiblePages);
    const toClear = _.difference(this.visiblePages, remaining);
    const toAdd = _.difference(visiblePages, remaining);
    this.visiblePages = visiblePages;
    for (let page of toClear) {
      this._clearPage(page);
    }
    for (let page of toAdd) {
      this._drawPage(page);
    }
  }

  _clearPage(pageIdx) {}

  _drawPage(pageIdx) {
    const pageDiv = this._pdf._pdfViewer._pages[pageIdx].div;
    if (pageDiv.getElementsByClassName(`highlight-layer`)[0]) {
      pageDiv.getElementsByClassName(`highlight-layer`)[0].remove();
    }
    const highlightLayer = this._createHighlightLayer(pageIdx);
    let textLayer;
    if ((textLayer = pageDiv.getElementsByClassName(`canvasWrapper`)[0]))
      pageDiv.insertBefore(highlightLayer, textLayer);
    else pageDiv.appendChild(highlightLayer);
  }

  _createHighlightLayer(pageIdx) {
    const highlightLayerDiv = document.createElement("div");
    highlightLayerDiv.classList = ["highlight-layer"];

    const { highlights, pageLeaf } = this.docProxy.listHighlightsForPageIdx(pageIdx);
    logger.log(`drawing ${highlights.length} highlights for page ${pageIdx}`);
    const toRender = _.flatten(
      highlights.map((annotation) => annotationToDivs(annotation, pageLeaf))
    );
    highlightLayerDiv.append(...toRender);
    return highlightLayerDiv;
  }

  _processSelectionComplete() {
    this._pendingSelectionChange = false;
    const selection = currentSelection(this.docProxy);
    if (ToolCategories.MARKUP_TYPES.includes(this.currentTool.type)) {
      if (selection != null) this._doMarkupSelection(selection);
    }
    if (ToolCategories.EDITOR_TYPES.includes(this.currentTool.type)) {
      if (selection != null) this._doEditSelection(selection);
    }
  }

  _processUndo(e) {
    logger.log("processing undo");
    if (this.undoQueue.length === 0) return;
    const action = this.undoQueue.pop();
    action.undoFn();
    this.redoQueue.push(action);
    this._updatePages();
    this._drawPage(action.params.pageIdx);
  }

  async getPDFBytes(options) {
    return await this.docProxy.getDocAsBytes();
  }

  async getPDFBytesNoAnnots(options) {
    return await this.docProxy.getDocAsBytesNoAnnots();
  }

  _broadcastToolChange() {
    window.dispatchEvent(
      new CustomEvent("pdf-tool-change", { detail: { tool: this.currentTool } })
    );
  }

  setCurrentTool(tool) {
    this._initStyleTag();
    this.currentTool = tool;
    if (ToolCategories.MARKUP_TYPES.includes(tool.type)) this._setMarkupTool(tool);
    if (ToolCategories.EDITOR_TYPES.includes(tool.type)) this._setEditTool(tool);
    this._setMarkupTool(tool);
    this._broadcastToolChange();
  }

  _setEditTool(tool) {
    if (tool.type == ToolTypes.OUTLINE) {
      const rawCSS = `:root { --highlight-color : default;}`;
      this.styleTag.innerHTML = rawCSS;
    }
  }

  _setMarkupTool(tool) {
    const rawCSS = `:root { 
      --highlight-color : ${
        tool.type == ToolTypes.HIGHLIGHT
          ? colorToHex(tool.color, tool.opacity)
          : colorToHex(tool.color, 0.5)
      };
      --highlight-text-decoration : ${
        tool.type == "Underline"
          ? `underline ${tool.underline_thickness || "2px"} ${tool.colorHex}`
          : "none"
      };
    }`;
    this.styleTag.innerHTML = rawCSS;
  }

  getCurrentTool() {
    return this._currentTool;
  }

  redo() {
    const action = this.redoQueue.pop();
    action.redoFn();
    this.redoQueue = [];
  }

  undo() {
    const action = this.undoQueue.pop();
    action.undoFn();
    this.redoQueue.push(action);
  }
}
