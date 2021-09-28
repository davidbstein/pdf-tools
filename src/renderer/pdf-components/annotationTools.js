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
} from "@/pdf-components/AnnotationHelpers";
import AnnotationTypes from "@/pdf-components/AnnotationTypes";
import { AnnotationFactory } from "annotpdf";
import { DOMSVGFactory } from "pdfjs-dist/legacy/build/pdf.js";
import {
  PDFDocument,
  PDFPageLeaf,
  PDFDict,
  PDFString,
  PDFArray,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFRef,
} from "pdf-lib";

const DEFAULTS = {
  clearSelection: true,
  tool: AnnotationTypes[0],
};

//debug tool
window.PDFObjToList = function (pdfObj) {
  let obj = PDFObjToDict(pdfObj);
  return [obj?.["/Type"], obj?.["/Subtype"], obj];
};

window.PDFObjToDict = function (pdfObj) {
  let obj = {
    __obj: pdfObj,
  };
  if (pdfObj instanceof PDFName) {
    // obj["name"] = pdfObj.encodedName;
    return pdfObj.encodedName;
  } else if (pdfObj instanceof PDFNumber) {
    // obj["num"] = pdfObj.numberValue;
    return pdfObj.numberValue;
  } else if (pdfObj instanceof PDFString) {
    // obj["str"] = pdfObj.value;
    return pdfObj.value;
  } else if (pdfObj instanceof PDFRef) {
    // obj = {
    //   ...obj,
    //   generationNumber: pdfObj.generationNumber,
    //   objectNumber: pdfObj.objectNumber,
    //   tag: pdfObj.tag,
    // };
    return pdfObj.tag;
  } else if (pdfObj instanceof PDFArray) {
    return pdfObj.array.map(PDFObjToDict);
  } else if (pdfObj instanceof PDFDict) {
    for (let [key, value] of pdfObj.dict?.entries()) {
      obj[key] = PDFObjToDict(value);
    }
  }
  return obj;
};

export default class HighlightManager {
  constructor(pdfViewer, data) {
    //singleton initialization
    if (window.HighlightManager) return;
    window.HighlightManager = this;

    //bind
    this.getAllIndirectObjects = this.getAllIndirectObjects.bind(this);
    this.annotateSelection = _.debounce(this.annotateSelection.bind(this), 100, { trailing: true });
    this.getAnnotations = this.getAnnotations.bind(this);
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
    this._initializeDocument();
  }

  async _initializeDocument() {
    const data = await this._pdf._doc.getData();
    this.pdfDocument = await new PDFDocument.load(data);
    this.pdfPages = this.pdfDocument.getPages();
    document.addEventListener("mouseup", (e) => {
      this._pendingSelectionChange ? this.annotateSelection() : null;
    });
    document.addEventListener("selectionchange", () => (this._pendingSelectionChange = true));
    document.addEventListener("keypress", this._undoListener);
    this._pdf.listenToPageRender(this._pageRenderListener.bind(this));
    console.log("debugDicts", this.getAllIndirectObjects());
  }

  getAllIndirectObjects() {
    return _.toArray(this.pdfDocument.context.indirectObjects.entries()).map(([_, e]) =>
      PDFObjToDict(e)
    );
  }

  getAnnotations() {
    return this.getAllIndirectObjects().filter(
      (obj) =>
        obj["/Type"] === "/Annot" ||
        obj["/Subtype"]?.indexOf(["/Highlight", "/Underline", "/Link", "/Line"]) > -1
    );
  }

  getDocMetadata() {
    const dictMap = this.pdfDocument.getInfoDict().dict;
    const metadata = {};
    for (let [k, v] of dictMap) metadata[k] = v;
    return metadata;
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
    const annotations = this.getAnnotations();
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

  _pageRenderListener({ pageNumber, source }) {
    //console.log("page render", pageNumber, source);
  }

  async getRawPDFWithAnnotations(filename) {
    //return this.annotationFactory.write();
    return await this.pdfDocument.save();
  }

  // getPageRefs() {
  //   const refs = [];
  //   this.pdfDocument.catalog.Pages().traverse((kid, ref) => {
  //     if (kid instanceof PDFPageLeaf) refs.push(ref);
  //   });
  //   return refs;
  // }

  generateOutline() {
    // generate all refs up front
    // associate refs with outline.
    // generate outline notes
    // add outline nodes to tree
  }

  /**
   * Creates an outline item.
   *
   * see https://github.com/Hopding/pdf-lib/issues/127
   * and https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/PDF32000_2008.pdf
   *    at §12.3.3 - Document Outlines
   *    also Annex H.6 - Outline Heiarchy Example
   *
   * - outline root
   *    - has no /Title, and optional `/Type /Outlines`
   * - root nodes:
   *    - have `/First` and `/Last` parameters referencing their first and last children.
   *    - /Count the number of decendant nodes.
   *    - may be nested.
   * - siblings must have `/Next` and `/Prev` refs.
   * - children must have a `/Parent` ref.
   * - objects should have a `/Dest` [ <ref> /XYZ x y z] (e.g. /Dest [4 0 R /XYZ 0 701 null]).
   *   nulls is top of page.
   * - `/Title`
   */
  createOutlineItem(title, parent, next, prev, pageRef) {
    let dest = PDFArray.withContext(pdfDoc.context);
    dest.push(pageRef);
    dest.push(PDFName.of("XYZ"));
    dest.push(PDFNull);
    dest.push(PDFNull);
    dest.push(PDFNull);

    const map = new Map();
    map.set(PDFName.Title, PDFString.of(title));
    if (parent) map.set(PDFName.Parent, parent);
    if (next) map.set(PDFName.of("Next"), next);
    if (prev) map.set(PDFName.of("Prev"), prev);
    map.set(PDFName.of("Dest"), dest);

    return PDFDict.fromMapWithContext(map, pdfDoc.context);
  }

  /**
   * creates an "Annot" item the conforms with the pdf spec.
   *
   * see https://github.com/Hopding/pdf-lib/issues/161
   * see https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/PDF32000_2008.pdf
   *    §12.5.2 - Annotation Dictionaries & §12.5.6.* - Annotation Types
   *
   * Annots entry should be in the page tree, and hold an array of annotation dicts.
   *
   * `/Type /Annot`
   * `/Subtype <see 12.5.6>`
   *  - 12.5.6.10 - Highlight, Underline, Squiggly, StrikeOut
   *  - 12.5.6.7 - Line
   *  - 12.5.6.5 - Link (/URI or /Dest)
   * `/Rect` - bounding rectangle of the annotation.
   * `/QuadPoints` - 8xn numbers, falling within Rect bounding box.
   * <optional> `/Contents`
   *
   */
  createAnnotationItem(pdfDoc, page, options) {
    pdfDoc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [145, PAGE_HEIGHT / 2 - 5, 358, PAGE_HEIGHT / 2 + 15],
      Border: [0, 0, 2],
      C: [0, 0, 1],
      A: {
        Type: "Action",
        S: "URI",
        URI: PDFString.of("https://github.com/Hopding/pdf-lib"),
      },
    });
    const linkAnnotationRef = pdfDoc.context.register(linkAnnotation);
  }
}
