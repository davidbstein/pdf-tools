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

function testOutlineWriter(hm) {
  console.group(`---- running outline writer integration test ----`);
  const outlines = this.docProxy.listOutlines();
  console.log("current outlines", outlines);
  outlines.map((outline) => {
    hm.docProxy.deleteOutline(outline);
  });
  hm.docProxy.createOutline([
    {
      title: "testRoot",
      page: 0,
      children: [
        {
          title: "testChild0",
          page: 1,
        },
        {
          title: "testChild1",
          page: 2,
          children: [
            {
              title: "testChild1.1",
              page: 3,
              children: [
                {
                  title: "testChild1.1.1",
                  page: [4, { type: "XYZ", args: [null, null, null] }],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);
  hm.docProxy.getDocAsBytes();
  console.log("loading window.d = <PDFDocument object>");
  window.d = hm.docProxy.doc;
  console.groupEnd();
}

export default class HighlightManager {
  runTests() {
    //testOutlineWriter(this);
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

    const actions = [];
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

  async getPDFBytes(options) {
    return await this.docProxy.getDocAsBytes();
  }

  _pageRenderListener({ pageNumber, source }) {
    //console.log("page render", pageNumber, source);
  }
}
