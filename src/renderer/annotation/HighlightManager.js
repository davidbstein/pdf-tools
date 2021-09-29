import _ from "lodash";
import {
  selectionToNodes,
  renderAnnotationDivs,
  nodeToQuadpoint,
  getTextNodeBoundingRect,
  getAncestorWithClass,
  currentSelection,
  colorToHex,
  colorToRGB,
} from "@/annotation/AnnotationHelpers";
import AnnotationTypes from "@/annotation/AnnotationTypes";
import { DOMSVGFactory } from "pdfjs-dist/legacy/build/pdf.js";
import DocProxy from "@/annotation/DocProxy";

const DEFAULTS = {
  clearSelection: false,
  tool: AnnotationTypes[0],
};

export default class HighlightManager {
  runTests() {
    console.log(`---- running tests ----`);
    this.docProxy.listOutlines().map((outline) => {
      this.docProxy.deleteOutline(outline);
    });
    this.docProxy.createOutline([
      {
        title: "testRoot",
        dest: [0, { type: "XYZ", args: [null, null, null] }],
        children: [
          { title: "testChild0", dest: [0, { type: "XYZ", args: [null, null, null] }] },
          {
            title: "testChild1",
            dest: [1, { type: "XYZ", args: [null, null, null] }],
            children: [
              {
                title: "testChild1.1",
                dest: [2, { type: "XYZ", args: [null, null, null] }],
                children: [
                  {
                    title: "testChild1.1.1",
                    dest: [3, { type: "XYZ", args: [null, null, null] }],
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    this.getRawPDFWithAnnotations();
  }

  constructor(pdfViewer) {
    //singleton initialization
    if (window.HighlightManager) return;
    window.HighlightManager = this;

    //bind
    this.annotateSelection = _.debounce(this.annotateSelection.bind(this), 100, { trailing: true });
    this.draw = this.draw.bind(this);
    this.setCurrentTool = this.setCurrentTool.bind(this);
    this.runTests = this.runTests.bind(this);
    this._undoListener = this._undoListener.bind(this);

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
  }

  async _initializeDocument() {
    const data = await this._pdf._doc.getData();
    this.docProxy = new DocProxy(data);
    document.addEventListener("mouseup", (e) => {
      this._pendingSelectionChange ? this.annotateSelection(e) : null;
    });
    document.addEventListener("selectionchange", () => (this._pendingSelectionChange = true));
    document.addEventListener("keypress", this._undoListener);
    this._pdf.listenToPageRender(this._pageRenderListener.bind(this));
  }

  setCurrentTool(tool) {
    this._initStyleTag();
    this.currentTool = tool;
    const { name, highlight_color, underline_color, annotation_types, opacity } = tool;
    const rawCSS = `:root { 
      --highlight-color : ${highlight_color ? colorToHex(highlight_color, opacity) : "transparent"};
      --highlight-text-decoration : ${
        underline_color
          ? `underline ${colorToHex(underline_color)} ${colorToHex(underline_thickness) || ""}`
          : "none"
      };
    }`;
    this.styleTag.innerHTML = rawCSS;
  }

  annotateSelection(selectionChangeEvent) {
    this._pendingSelectionChange = false;

    // only run if there is some selection
    const _selection = currentSelection();
    if (_selection == null) return;
    const { pageDiv, pageNumber, quadPoints, text } = _selection;
    const pageIdx = pageNumber - 1;
    let tool = this.currentTool;
    let color, opacity, opts;

    actions = [];
    //act
    if (tool.highlight_color) {
      color = colorToRGB(tool.highlight_color);
      opacity = tool.opacity || 0.5;
      opts = {};
      actions.push(this.highlight({ pageIdx, color, opacity, quadPoints, opts }));
    }
    if (tool.underline_color) {
      color = colorToRGB(tool.underline_color);
      opacity = tool.opacity || 1;
      opts = { thickness: tool.underline_thickness };
      actions.push(this.underline({ pageIdx, color, opacity, quadPoints, opts }));
    }
    //TODO; add undo info
    this.undoQueue.push(actions);
    this.draw();
    this.clearSelection ? document.getSelection().removeAllRanges() : null;
  }

  highlight({ pageIdx, color, opacity, quadPoints, opts }) {
    console.log(`highlight ${pageIdx}, ${color}, ${opacity}, ${opts}`);
  }

  underline({ pageIdx, color, opacity, quadPoints, opts }) {
    console.log(`underline ${pageIdx}, ${color}, ${opacity}, ${opts}`);
  }
  draw() {
    const annotations = this.docProxy.listAnnotations();
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

  async getRawPDFWithAnnotations(filename) {
    return await this.docProxy.getRawPDFWithAnnotations(filename);
  }

  _pageRenderListener({ pageNumber, source }) {
    //console.log("page render", pageNumber, source);
  }
}
