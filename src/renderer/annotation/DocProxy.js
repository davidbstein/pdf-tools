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
    //bind
    this._createOutlineItem = this._createOutlineItem.bind(this);
    this._rootToOutline = this._rootToOutline.bind(this);
    this.addAnnotation = this.addAnnotation.bind(this);
    this.createOutline = this.createOutline.bind(this);
    this.deleteOutline = this.deleteOutline.bind(this);
    this.getAllIndirectObjects = this.getAllIndirectObjects.bind(this);
    this.listAnnotations = this.listAnnotations.bind(this);
    this.listOutlines = this.listOutlines.bind(this);
    this.listPageRefs = this.listPageRefs.bind(this);
    this.lookupDict = this.lookupDict.bind(this);
    this.removeAnnotation = this.removeAnnotation.bind(this);
    this.deleteOutline = this.deleteOutline.bind(this);
    this.createAnnotationItem = this.createAnnotationItem.bind(this);
    // load
    this._initializeDocument = this._initializeDocument.bind(this);
    this._initializeDocument(data);
  }

  _initializeDocument(data) {
    PDFDocument.load(data).then((doc) => {
      this.doc = doc;
      this.pages = doc.getPages();
      this.context = doc.context;
    });
  }

  getAllIndirectObjects() {
    return _.toArray(this.context.indirectObjects.entries()).map(([_, e]) => PDFObjToDict(e));
  }

  lookupDict(refDict) {
    let obj = this.doc.context.lookup(refDict.ref);
    if (obj === undefined) console.error(`${refDict.ref} not found`);
    return PDFObjToDict(obj);
  }

  listAnnotations() {
    return this.getAllIndirectObjects().filter(
      (obj) =>
        obj["/Type"] === "/Annot" ||
        obj["/Subtype"]?.indexOf(["/Highlight", "/Underline", "/Link", "/Line"]) > -1
    );
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
    return [this.pages.map((page) => this.context.getObjectRef(page.__obj))];
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

  deleteOutline(outlineRoot) {
    for (let node of outlineRoot.children) this.deleteOutline(node);
    const ref = this.context.getObjectRef(outlineRoot.node.__obj);
    this.doc.context.delete(ref);
  }

  _genDest([pageIdx, destDict], context) {
    let dest = PDFArray.withContext(context);
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
   *   dest: ([pageIdx, {type, args]}])
   *   children: [{}, {}, ...]
   *  }, {}, ...
   * ]
   */
  createOutline(outline) {
    //TODO
    const pageRefs = this.listPageRefs();
    const root = {
      children: outline,
      _root: true,
    };
    let current = root;
    let all_items = [];
    while (true) {
      // console.log(">> - ", current);
      if (!current.info) {
        all_items.push(current);
        current.info = {};
        current.info.ref = this.doc.context.nextRef();
        if (current.dest) current.info.dest = this._genDest(current.dest, this.context);
        if (current.title) current.info.title = current.title;
        if (current.children?.length > 0) {
          current.children.forEach((child, idx, array) => {
            child.parent = current;
            if (idx > 0) child.prev = array[idx - 1];
            if (idx < array.length - 1) child.next = array[idx + 1];
          });
          current.first = current.children[0];
          current.last = current.children[current.children.length - 1];
          current.info.count = current.children.length;
        }
      }
      // console.log(">> + ", current);
      if (current.first && !current.first.info) {
        // console.log("first", current.first);
        current = current.first;
      } else if (current.next) {
        if (current.count) current.parent.info.count += current.info.count;
        // console.log("next", current.next);
        current = current.next;
      } else if (current.parent) {
        if (current.count) current.parent.info.count += current.info.count;
        // console.log("parent", current.parent);
        current = current.parent;
      } else if (current._root) {
        break;
      }
    }
    console.log("ROOT NODE", root);
    // initialize Map that will become the PDFDict
    let map;
    for (let {
      info: { count, title, ref, dest },
      first,
      last,
      next,
      prev,
      parent,
      _root,
    } of all_items) {
      map = new Map();
      if (_root) map.set(PDFName.Type, PDFName.of("Outlines"));
      if (title) map.set(PDFName.Title, PDFString.of(title));
      if (parent) map.set(PDFName.Parent, parent.info.ref);
      if (next) map.set(PDFName.of("Next"), next.info.ref);
      if (prev) map.set(PDFName.of("Prev"), prev.info.ref);
      if (first) map.set(PDFName.of("First"), first.info.ref);
      if (last) map.set(PDFName.of("Last"), last.info.ref);
      if (dest) map.set(PDFName.of("Dest"), dest);
      if (count) map.set(PDFName.of("Count"), PDFNumber.of(count));
      this.context.assign(ref, PDFDict.fromMapWithContext(map, this.context));
      console.log(ref);
    }
  }

  addAnnotation() {
    //TODO
  }

  removeAnnotation() {
    //TODO
  }

  modifyAnnotation() {
    //TODO
  }

  getDocMetadata() {
    const dictMap = this.doc.getInfoDict().dict;
    const metadata = {};
    for (let [k, v] of dictMap) metadata[k] = v;
    return metadata;
  }

  async getRawPDFWithAnnotations(filename) {
    //return this.annotationFactory.write();
    return await this.doc.save();
  }

  _createOutlineItem({}) {
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
