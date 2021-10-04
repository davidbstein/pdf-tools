/**
 * Notes on Outlines:
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

/**
 *
 * Nots on Annotations:
 * "Annot" item in the pdf spec:
 *
 * see https://github.com/Hopding/pdf-lib/issues/161
 * see https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/PDF32000_2008.pdf#G11.2023455
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
import { node } from "prop-types";
import { colorToHex } from "./AnnotationHelpers";

function PDFObjToDict(pdfObj) {
  let obj = {
    __obj: pdfObj,
  };
  if (pdfObj instanceof PDFName) {
    return pdfObj.encodedName;
  } else if (pdfObj instanceof PDFNumber) {
    return pdfObj.numberValue;
  } else if (pdfObj instanceof PDFString) {
    return pdfObj.value;
  } else if (pdfObj instanceof PDFRef) {
    return {
      generationNumber: pdfObj.generationNumber,
      objectNumber: pdfObj.objectNumber,
      tag: pdfObj.tag,
      ref: pdfObj,
    };
  } else if (typeof pdfObj == "PDFNull") {
    return null;
  } else if (pdfObj instanceof PDFArray) {
    return pdfObj.array.map(PDFObjToDict);
  } else if (pdfObj instanceof PDFDict) {
    for (let [key, value] of pdfObj.dict?.entries()) {
      obj[key] = PDFObjToDict(value);
    }
  }
  return obj;
}

export default class DocProxy {
  //debug tool
  PDFObjToList(pdfObj) {
    let obj = PDFObjToDict(pdfObj);
    return [obj?.["/Type"], obj?.["/Subtype"], obj];
  }

  constructor(data) {
    const _methods = Object.getOwnPropertyNames(this.__proto__);
    for (let _method of _methods)
      this[_method] = _method != "constructor" ? this[_method].bind(this) : 0;
    PDFDocument.load(data).then((doc) => {
      this.doc = doc;
      this.pages = doc.getPages();
    });
  }

  getAllIndirectObjects() {
    return _.toArray(this.doc.context.indirectObjects.entries()).map(([_, e]) => PDFObjToDict(e));
  }

  lookup(ref) {
    if (ref.ref) ref = ref.ref;
    return this.doc.context.lookup(ref);
  }

  lookupDict(refDict) {
    let obj = this.lookup(refDict.ref);
    if (obj === undefined) console.error(`${refDict.ref} not found`);
    return PDFObjToDict(obj);
  }

  listOutlines() {
    return this.getAllIndirectObjects()
      .filter(
        (obj) =>
          obj["/Type"] === "/Outlines" ||
          (obj["/First"] && obj["/Last"] && obj["/Count"] && !obj["/Parent"])
      )
      .map(this._rootToOutline);
  }

  listPageRefs() {
    return [this.pages.map((page) => this.doc.context.getObjectRef(page.__obj))];
  }

  _rootToOutline(node, parent) {
    const children = [];
    if (node["/First"]) {
      let current = this.lookupDict(node["/First"]);
      while (true) {
        children.push(this._rootToOutline(current, node));
        if (current["/Next"]) current = this.lookupDict(current["/Next"]);
        else break;
      }
    }
    return { node, title: node["/Title"], children, dest: node["/Dest"] };
  }

  updateMaxObjectNumber() {
    let maxObjectNumber = 0;
    for (let [entry, _] of this.doc.context.indirectObjects.entries())
      maxObjectNumber = Math.max(maxObjectNumber, entry.objectNumber);
    this.doc.context.largestObjectNumber = maxObjectNumber;
    console.log(`reset max object number to: ${maxObjectNumber}`);
  }

  deleteOutline(outlineRoot, shouldUpdateMaxObjectNumber = false) {
    for (let node of outlineRoot.children) this.deleteOutline(node, false);
    const ref = this.doc.context.getObjectRef(outlineRoot.node.__obj);
    this.doc.context.delete(ref);
    if (shouldUpdateMaxObjectNumber) this.updateMaxObjectNumber();
    this.doc.flush();
  }

  _genDest(page, context) {
    const [pageIdx, destDict] = [
      typeof page === "number" ? page : page[0],
      typeof page === "number" ? { type: "XYZ", args: [null, null, null] } : page[1],
    ];
    console.log("GEN DEST", pageIdx, destDict);
    let pageRef = this.pages[pageIdx].ref;
    let dest = PDFArray.withContext(context);
    dest.push(pageRef);
    dest.push(PDFName.of(destDict.type));
    destDict.args.map((arg) => {
      dest.push(arg == null ? PDFNull : new PDFNumber(arg));
    });
    return dest;
  }

  /**
   * outlineDict expects an outline of the form:
   * [
   *  {
   *   title: "Title",
   *   page: pageIdx | [pageIdx, {type, args]}]
   *   children: [{}, {}, ...]
   *  }, {}, ...
   * ]
   */
  createOutline(outline) {
    console.log(`largestObjectNumber = ${this.doc.context.largestObjectNumber}`);
    const pageRefs = this.listPageRefs();
    const root = {
      children: outline,
      _root: true,
    };
    let current = root;
    let all_items = [];
    while (true) {
      if (!current.info) {
        all_items.push(current);
        current.info = {};
        current.info.ref = this.doc.context.nextRef();
        current.info.count = 0;
        if (current.page != undefined)
          current.info.dest = this._genDest(current.page, this.doc.context);
        if (current.title) current.info.title = current.title;
        if (current.children?.length > 0) {
          current.children.forEach((child, idx, array) => {
            child.parent = current;
            if (idx > 0) child.prev = array[idx - 1];
            if (idx < array.length - 1) child.next = array[idx + 1];
          });
          current.first = current.children[0];
          current.last = current.children[current.children.length - 1];
        }
        let par = current;
        while ((par = par.parent)) {
          par.info.count++;
        }
      }
      if (current.first && !current.first.info) {
        current = current.first;
      } else if (current.next) {
        current = current.next;
      } else if (current.parent) {
        current = current.parent;
      } else if (current._root) {
        break;
      }
    }
    console.log("ROOT NODE", root);
    // initialize Map that will become the PDFDict
    console.groupCollapsed(" ~created outline!~ ");
    for (let { info, ...rest } of all_items) {
      console.log(">>", info);
      const { count, title, ref, dest } = info;
      const { first, last, next, prev, parent, _root } = rest;
      const map = new Map();
      if (_root) map.set(PDFName.Type, PDFName.of("Outlines"));
      if (title) map.set(PDFName.Title, PDFString.of(title));
      if (parent) map.set(PDFName.Parent, parent.info.ref);
      if (next) map.set(PDFName.of("Next"), next.info.ref);
      if (prev) map.set(PDFName.of("Prev"), prev.info.ref);
      if (first) map.set(PDFName.of("First"), first.info.ref);
      if (last) map.set(PDFName.of("Last"), last.info.ref);
      if (dest) map.set(PDFName.of("Dest"), dest);
      if (count) map.set(PDFName.of("Count"), PDFNumber.of(count));
      const dict = PDFDict.fromMapWithContext(map, this.doc.context);
      this.doc.context.assign(ref, dict);
      if (_root) this.doc.catalog.set(PDFName.of("Outlines"), ref);
      console.log(dict.toString()); //, _.fromPairs(Array.from(map.entries(), (e) => e)));
    }
    console.log(this.doc.catalog.toString());
    console.groupEnd();
  }

  getDocMetadata() {
    const dictMap = this.doc.getInfoDict().dict;
    const metadata = {};
    for (let [k, v] of dictMap) metadata[k] = v;
    return metadata;
  }

  async getDocAsBytes(options) {
    return await this.doc.save({ useObjectStreams: false });
  }

  async genPDF() {
    await this.doc.flush();
    let offset = 0;
    const buffer = new Uint8Array(size);
  }

  /**
   * type: Highlight,  Underline,  Squiggly
   * QuadPoints: [x1, y1, x2, y2, x3, y3, x4, y4 ...]
   */
  createHighlight({ pageIdx, color, opacity, quadPoints, rect, type }) {
    const page = this.pages[pageIdx];
    const pageRef = page.ref;
    const pageLeaf = this.lookup(page.ref);
    const highlightDict = this.doc.context.obj({
      Type: "Annot",
      Subtype: type,
      QuadPoints: quadPoints,
      Rect: [0, 0, 0, 0],
      C: [color.r / 255, color.g / 255, color.b / 255],
      CA: opacity,
      P: pageRef,
      T: PDFString.of("USERNAME"),
    });
    const highlightRef = this.doc.context.register(highlightDict);
    pageLeaf.addAnnot(highlightRef);
    console.log(highlightRef);
    console.log(highlightDict.toString());
    return highlightRef;
  }

  listHighlights() {
    const highlightTypes = ["/Highlight", "/Underline", "/Squiggly", "/StrikeOut"];
    return this.getAllIndirectObjects()
      .filter((a) => highlightTypes.indexOf(a?.["/Subtype"]) >= 0)
      .map((obj) => obj);
  }

  removeAnnotation(ref) {}
}
