import _ from "lodash";
import { currentSelection, colorToHex, colorToRGB } from "@/annotation/AnnotationHelpers";
import { ToolList, ToolTypes } from "@/annotation/AnnotationTypes";
import { DOMSVGFactory } from "pdfjs-dist/legacy/build/pdf.js";
import DocProxy from "@/annotation/DocProxy";
import { testOutlineWriter /*testAnnotation*/ } from "@/tests/highlightManagerTests";

const DEFAULTS = {
  clearSelection: false,
  tool: ToolList[0],
};

function testAnnotation(hm) {
  const highlights = hm.docProxy.listHighlights();
  for (let h of highlights) console.log(h.__obj.toString());
}

export default class HighlightManager {
  runTests() {
    //testOutlineWriter(this);
    testAnnotation(this);
    window.hm = this;
    window.d = this.docProxy;
  }

  constructor(pdfViewer) {
    //singleton initialization
    if (window.HighlightManager) return;
    window.HighlightManager = this;

    //bind
    const _methods = Object.getOwnPropertyNames(this.__proto__);
    for (let _method of _methods)
      this[_method] = _method != "constructor" ? this[_method].bind(this) : 0;

    // decorate
    this.annotateSelection = _.debounce(this.annotateSelection, 100, { trailing: true });

    //instance internals
    this._pdf = pdfViewer;
    this._pendingSelectionChange = false;
    this.highlightDivs = {};
    this.annotationMap = {};
    this.undoQueue = [];

    // settings and defaults
    this.clearSelection = DEFAULTS.clearSelection;
    this.setCurrentTool(DEFAULTS.tool);

    // load
    this._initializeDocument();
    console.warn(
      "%cYOU MUST DELETE THIS IT'S FOR TESTING",
      "color: red",
      setTimeout(function () {
        window.HighlightManager.runTests();
      }, 1000)
    );
  }

  async _initializeDocument() {
    const data = await this._pdf._doc.getData();
    this.docProxy = new DocProxy(data);
    document.addEventListener("mouseup", this.processMouseUp);
    document.addEventListener("mousedown", this.processMouseDown);
    document.addEventListener("selectionchange", () => (this._pendingSelectionChange = true));
    document.addEventListener("keypress", this._undoListener);
    this._pdf.listenToPageRender(this._pageRenderListener.bind(this));
  }

  registerToolChangeListener(listener) {
    const listenerId = _.uniqueId("toolChangeListener");
    this.toolChangeListeners[listenerId] = listener;
    return listenerId;
  }

  unregisterToolChangeListener(listenerId) {
    delete this.toolChangeListeners[listenerId];
  }

  _notifyToolChangeListeners() {
    _.forEach(this.toolChangeListeners, (listener) => {
      listener(this.currentTool);
    });
  }

  setCurrentTool(tool) {
    this._initStyleTag();
    this.currentTool = tool;
    const rawCSS = `:root { 
      --highlight-color : ${
        tool.type == ToolTypes.HIGHLIGHT ? colorToHex(tool.color, tool.opacity) : "transparent"
      };
      --highlight-text-decoration : ${
        tool.type == "Underline"
          ? `underline ${colorToHex(underline_color)} ${colorToHex(underline_thickness) || ""}`
          : "none"
      };
    }`;
    this.styleTag.innerHTML = rawCSS;
    this._notifyToolChangeListeners();
  }

  processMouseDown(e) {
    console.log(`mouse down ${e.button}`);
  }

  processMouseUp(e) {
    console.log(`mouse up ${e.button}`);
    // process left mouse button
    if (e.button == 0) {
      this._pendingSelectionChange = false;
      const selection = currentSelection(this.docProxy);
      if (selection != null) this.annotateSelection(selection, this.docProxy.pages);
    }
    //process right mouse button
    if (e.button == 2) {
      console.log("right mouse");
    }
  }

  annotateSelection(selection) {
    const actions = [];
    actions.push(
      this.highlight({
        ...selection,
        ...this.currentTool,
      })
    );

    //TODO; add undo info
    this.undoQueue.push(actions);
    this.draw();
    this.clearSelection ? document.getSelection().removeAllRanges() : null;
  }

  highlight(options) {
    this.docProxy.createHighlight(options);
  }

  draw() {
    // TODO: draw unsaved highlights
  }

  _initStyleTag() {
    if (!this.styleTag) {
      this.styleTag = document.createElement("style");
      this.styleTag.type = "text/css";
      document.head.appendChild(this.styleTag);
    }
    return this.styleTag;
  }

  _undoListener(e) {
    if (e.key == "z" && e.ctrlKey) {
      if (this.undoQueue.length === 0) return;
      const annotation = this.undoQueue.pop();
      annotation.is_deleted = true;
      this.draw();
    }
  }

  async getPDFBytes(options) {
    return await this.docProxy.getDocAsBytes();
  }

  _pageRenderListener({ pageNumber, source }) {
    //console.log("page render", pageNumber, source);
  }
}
