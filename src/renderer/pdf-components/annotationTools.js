import _ from "lodash";
import { AnnotationFactory } from "annotpdf";
import {
  selectionToNodes,
  getAncestorWithClass,
  getTextNodeBoundingRect,
  nodeToQuadpoint,
  renderAnnotationDivs,
  currentSelection,
} from "@/pdf-components/AnnotationHelpers";
import { DOMSVGFactory } from "pdfjs-dist";

export default class HighlightManager {
  constructor(pdfViewer, data) {
    this._pdf = pdfViewer;
    this._pendingSelectionChange = false;
    this.highlightDivs = {};
    this.annotationMap = {};
    this.undoQueue = [];

    //bind
    this.highlightCurrentSelection = _.debounce(this.highlightCurrentSelection.bind(this), 100, {
      trailing: true,
    });
    this._undoListener.bind(this);
    this.draw = this.draw.bind(this);
    this._undoListener = this._undoListener.bind(this);
    window.HighlightManager = this;

    // load
    this._pdf._doc.getData().then((data) => {
      this._annotationFactory = new AnnotationFactory(data);
      window._annotationFactory = this._annotationFactory;
      document.addEventListener("mouseup", (e) => {
        this._pendingSelectionChange ? this.highlightCurrentSelection() : null;
      });
      document.addEventListener("selectionchange", () => (this._pendingSelectionChange = true));
      document.addEventListener("keypress", this._undoListener);
      this._pdf.listenToPageRender(this._pageRenderListener.bind(this));
    });
  }

  draw() {
    const annotations = this._annotationFactory.annotations;
    for (let a of annotations) {
      if (this.annotationMap[a.id] == null) {
        this.annotationMap[a.id] = a;
        this.undoQueue.push(a);
      }
      const annotationId = a.id;
      if (a.is_deleted) {
        if (this.highlightDivs[annotationId]) {
          this.highlightDivs[annotationId].map((div) => div.remove());
          delete this.highlightDivs[annotationId];
        }
      } else {
        if (this.highlightDivs[annotationId]) {
          // nothing to do. Maybe cleanup when not rendered....
        } else {
          this.highlightDivs[annotationId] = renderAnnotationDivs(a);
          console.log("drawing", a, this.highlightDivs[annotationId]);
        }
      }
    }
  }

  _undoListener(e) {
    if (e.key == "z" && e.ctrlKey) {
      if (this.undoQueue.length === 0) return;
      const annotation = this.undoQueue.pop();
      annotation.is_deleted = true;
      this.draw();
    }
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

  _pageRenderListener({
    pageNumber,
    source: { annotationLayer, annotationLayerFactory, div: pageDiv, onBeforeDraw, onAfterDraw },
  }) {
    console.log("page-render-annotation-listener");
    onBeforeDraw(() => console.log("listener - before draw"));
    onAfterDraw(() => console.log("listener - after draw"));
  }

  highlightCurrentSelection(selectionChangeEvent) {
    console.log(selectionChangeEvent);
    // only run if there is some selection
    const _selection = currentSelection();
    if (_selection == null) return;
    const { pageDiv, pageNumber, quadPoints, text } = _selection;
    const highlight = this.highlight(
      pageNumber,
      [],
      "test string",
      "Stein",
      { r: 0.9, g: 0.2, b: 0.1 },
      0.25,
      quadPoints
    );
    console.log(this._annotationFactory.annotations);
    this.draw();
    return highlight;
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
  highlight(page, rect, contents, author, { r, g, b }, opacity, quadPoints) {
    return this._annotationFactory.createHighlightAnnotation({
      page,
      rect,
      contents,
      author,
      color: { r, g, b },
      opacity,
      quadPoints,
    });
  }

  /**
   * see `highlight` for input format
   */
  underline(page, [x1, y1, x2, y2], contents, author, { r, g, b }, opacity, quadPoints) {
    return this._annotationFactory.createUnderlineAnnotation({
      page,
      rect: [x1, y1, x2, y2],
      contents,
      author,
      color: { r, g, b, a },
      opacity,
      quadPoints,
    });
  }

  /**
   * see `highlight` for input format. quadPoints unavailable
   */
  rectangle(page, [x1, y1, x2, y2], contents, author, outline_rgb, fill_rgb) {
    return this._annotationFactory.createSquareAnnotation({
      page,
      rect: [x1, y1, x2, y2],
      contents,
      author,
      color: outline_rgb,
      fill: fill_rgb,
    });
  }

  /**
   *
   * @param {*} page
   * @param {*} rect
   * @param {*} contents
   * @param {*} author
   * @param {*} color
   * @param {*} textJustification
   * @param {*} freetextType
   * @param {*} calloutLine
   * @param {*} lineEndingStyle
   */
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
