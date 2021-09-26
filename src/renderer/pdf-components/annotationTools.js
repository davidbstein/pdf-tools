import _ from "lodash";
import { AnnotationFactory } from "annotpdf";
import {
  selectionToNodes,
  renderAnnotationDivs,
  nodeToQuadpoint,
  getTextNodeBoundingRect,
  getAncestorWithClass,
  currentSelection,
  colorToHex,
  colorToRGB,
} from "@/pdf-components/AnnotationHelpers";
import AnnotationTypes from "@/pdf-components/AnnotationTypes";
import { DOMSVGFactory } from "pdfjs-dist";

const DEFAULTS = {
  clearSelection: true,
  tool: AnnotationTypes[0],
};

export default class HighlightManager {
  constructor(pdfViewer, data) {
    //singleton initialization
    if (window.HighlightManager) return;
    window.HighlightManager = this;

    //bind
    this.annotateCurrentSelection = this.annotateCurrentSelection.bind(this);
    this.annotateCurrentSelection = _.debounce(this.annotateCurrentSelection, 100, {
      trailing: true,
    });
    this.draw = this.draw.bind(this);
    this.setCurrentTool = this.setCurrentTool.bind(this);
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
    this._pdf._doc.getData().then((data) => {
      this._annotationFactory = new AnnotationFactory(data);
      window._annotationFactory = this._annotationFactory;
      document.addEventListener("mouseup", (e) => {
        this._pendingSelectionChange ? this.annotateCurrentSelection() : null;
      });
      document.addEventListener("selectionchange", () => (this._pendingSelectionChange = true));
      document.addEventListener("keypress", this._undoListener);
      this._pdf.listenToPageRender(this._pageRenderListener.bind(this));
    });
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

  annotateCurrentSelection(selectionChangeEvent) {
    console.log(selectionChangeEvent);
    // only run if there is some selection
    const _selection = currentSelection();
    if (_selection == null) return;
    const { pageDiv, pageNumber, quadPoints, text } = _selection,
      page = pageNumber - 1,
      rects = [],
      content = "test annotation",
      author = "stein pdf",
      tool = this.currentTool;
    let color, opacity, opts;
    if (tool.highlight_color) {
      color = colorToRGB(tool.highlight_color);
      opacity = tool.opacity || 0.5;
      opts = {};
      this.highlight(page, rects, content, author, color, opacity, quadPoints, opts);
    }
    if (tool.underline_color) {
      color = colorToRGB(tool.underline_color);
      opacity = tool.opacity || 1;
      opts = { thickness: tool.underline_thickness };
      this.underline(page, rects, content, author, color, opacity, quadPoints, opts);
    }
    this.draw();
    this.clearSelection ? document.getSelection().removeAllRanges() : null;
  }

  draw() {
    const annotations = this._annotationFactory.annotations;
    for (let a of annotations) {
      if (this.annotationMap[a.id] == null) {
        this.annotationMap[a.id] = a;
        this.undoQueue.push(a);
      }
      if (a.is_deleted) {
        if (this.highlightDivs[a.id]) {
          this.highlightDivs[a.id].map((div) => div.remove());
          delete this.highlightDivs[a.id];
        }
      } else {
        if (this.highlightDivs[a.id]) {
          // nothing to do. Maybe cleanup when not rendered....
        } else {
          this.highlightDivs[a.id] = renderAnnotationDivs(a);
        }
      }
    }
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

  _pageRenderListener({
    pageNumber,
    source: { annotationLayer, annotationLayerFactory, div: pageDiv, onBeforeDraw, onAfterDraw },
  }) {
    onBeforeDraw(() => console.log("listener - before draw"));
    onAfterDraw(() => console.log("listener - after draw"));
  }

  getAnnotationsForPage(pageIdx) {
    return this._annotationFactory?.annotations?.filter(
      (annotation) => annotation.page === pageIdx
    );
  }

  getAnnotations() {
    return this._annotationFactory?.getAnnotations();
  }

  getRawPDFWithAnnotations() {
    return this._annotationFactory?.write();
  }

  download() {
    return this._annotationFactory.download();
  }

  /**
   * Annotation functions all follow the same input format:
   * @param {num} page - the page number
   * @param {[num]} rect - the bounding rectangle, [bottomx, bottomy, topx, topy]. empty if quadPoints is specified
   * @param {String} contents - text associated with the annotation
   * @param {String} author - the author of the annotation
   * @param {{r:num, g:num, b:num}} color - the color of the annotation. rgb is either doubles 0-1 or integers 0-255
   * @param {num} opacity - the opacity of the annotation. 0-1. 0 is transparent, 1 is opaque
   * @param {[[num]]} quadPoints - the quadPoints of the annotation. provided as a flat list, 8 numbers per rectangle.
   * quadPoints are [bottomleftx, bottomlefty, bottomrightx, bottomrighty, topleftx, toplefty, toprightx, toprighty]
   */
  highlight(page, rect, contents, author, color, opacity, quadPoints) {
    const args = { page, rect, contents, author, color, opacity, quadPoints };
    return this._annotationFactory.createHighlightAnnotation(args);
  }

  underline(page, [x1, y1, x2, y2], contents, author, color, opacity, quadPoints, opts) {
    console.log("underline: not using options");
    const args = { page, rect: [x1, y1, x2, y2], contents, author, color, opacity, quadPoints };
    return this._annotationFactory.createUnderlineAnnotation(args);
  }

  rectangle(page, [x1, y1, x2, y2], contents, author, outline_rgb, fill_rgb) {
    const rect = [x1, y1, x2, y2];
    const args = { page, rect, contents, author, color: outline_rgb, fill: fill_rgb };
    return this._annotationFactory.createSquareAnnotation(args);
  }

  freeText(
    page,
    rect,
    contents,
    author,
    color,
    textJustification,
    freetextType,
    calloutLine,
    lineEndingStyle
  ) {
    return this._annotationFactory.createFreeTextAnnotation({
      page,
      rect,
      contents,
      author,
      color,
      textJustification,
      freetextType,
      calloutLine,
      lineEndingStyle,
    });
  }
}
