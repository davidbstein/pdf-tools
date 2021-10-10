import _ from "lodash";
import {
  currentSelection,
  colorToHex,
  colorToRGB,
  annotationToDivs,
} from "@/annotation/AnnotationHelpers";
import { ToolList, ToolTypes } from "@/annotation/AnnotationTypes";
import { DOMSVGFactory } from "pdfjs-dist/legacy/build/pdf.js";
import DocProxy from "@/annotation/DocProxy";
import { testOutlineWriter /*testAnnotation*/ } from "@/tests/highlightManagerTests";

const DEFAULTS = {
  clearSelection: true,
  tool: ToolList[0],
};

function testAnnotation(hm) {
  const highlights = hm.docProxy.listHighlights();
  console.groupCollapsed("highlights");
  for (let h of highlights) console.log(h.__obj.toString());
  console.groupEnd();
}

function runTests(hm) {
  //testOutlineWriter(this);
  window.hm = hm;
  window.d = hm.docProxy;
  testAnnotation(hm);
}

export default class HighlightManager {
  constructor(pdfViewer) {
    if (window.HighlightManager) return;
    else window.HighlightManager = this;

    const _methods = Object.getOwnPropertyNames(this.__proto__);
    for (let _method of _methods) {
      this[_method] = _method != "constructor" ? this[_method]?.bind(this) : 0;
    }
    //instance internals
    _.debounce(this._doAnnotateSelection, 100, { trailing: true });
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
    this.docProxy = await DocProxy.createDocProxy(data);
    document.addEventListener("mouseup", this._processMouseUp);
    document.addEventListener("mousedown", this._processMouseDown);
    document.addEventListener("selectionchange", () => (this._pendingSelectionChange = true));
    document.addEventListener("keypress", this._undoListener);
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

  _detectPageRender({ pageNumber, ...rest }) {
    //console.log("page render", pageNumber, rest);
    this._updatePages();
    this._drawPage(pageNumber - 1);
  }

  _detectPageChange({ pageNumber, previous, ...rest }) {
    console.log(`current page: ${pageNumber}, last page: ${previous}`);
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
    if (pageDiv.getElementsByClassName(`highlight-layer`)[0])
      pageDiv.getElementsByClassName(`highlight-layer`)[0].remove();
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
    const toRender = _.flatten(
      highlights.map((annotation) => annotationToDivs(annotation, pageLeaf))
    );
    highlightLayerDiv.append(...toRender);
    return highlightLayerDiv;
  }

  _detectUndo(e) {
    if (e.key == "z" && e.ctrlKey) {
      if (this.undoQueue.length === 0) return;
      const annotation = this.undoQueue.pop();
      annotation.is_deleted = true;
    }
  }

  _processMouseDown(e) {
    //console.log(`mouse down ${e.button}`);
  }

  _processMouseUp(e) {
    console.log(`mouse up ${e.button}`);
    // process left mouse button
    if (e.button == 0) {
      this._pendingSelectionChange = false;
      const selection = currentSelection(this.docProxy);
      if (selection != null) this._doAnnotateSelection(selection);
    }
    //process right mouse button
    if (e.button == 2) {
      console.log("right mouse");
    }
  }

  _doAnnotateSelection(selection) {
    const action = this.docProxy.createHighlight({ ...selection, ...this.currentTool });

    this.undoQueue.push(action);
    this.redoQueue = [];
    this.clearSelection ? document.getSelection().removeAllRanges() : null;
    this._pdf.autoSave();
    this._drawPage(action.pageIdx);
  }

  registerToolChangeListener(listener) {
    const listenerId = _.uniqueId("toolChangeListener");
    this.toolChangeListeners[listenerId] = listener;
    return listenerId;
  }

  async getPDFBytes(options) {
    return await this.docProxy.getDocAsBytes();
  }

  async getPDFBytesNoAnnots(options) {
    return await this.docProxy.getDocAsBytesNoAnnots();
  }

  unregisterToolChangeListener(listenerId) {
    delete this.toolChangeListeners[listenerId];
  }

  notifyToolChangeListeners() {
    _.forEach(this.toolChangeListeners, (listener) => {
      listener(this.currentTool);
    });
  }

  setCurrentTool(tool) {
    this._initStyleTag();
    this.currentTool = tool;
    const rawCSS = `:root { 
      --highlight-color : ${
        tool.type == ToolTypes.HIGHLIGHT
          ? colorToHex(tool.color, tool.opacity)
          : colorToHex(tool.color, 0.2)
      };
      --highlight-text-decoration : ${
        tool.type == "Underline"
          ? `underline ${tool.underline_thickness || "2px"} ${tool.colorHex}22`
          : "none"
      };
    }`;
    this.styleTag.innerHTML = rawCSS;
    this.notifyToolChangeListeners();
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
