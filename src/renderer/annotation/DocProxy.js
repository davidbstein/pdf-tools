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
    this.getAllIndirectObjects = this.getAllIndirectObjects.bind(this);
    this.listAnnotations = this.listAnnotations.bind(this);
    this.listOutlines = this.listOutlines.bind(this);
    this._rootToOutline = this._rootToOutline.bind(this);
    this.lookupDict = this.lookupDict.bind(this);
    // load
    this._initializeDocument = this._initializeDocument.bind(this);
    this._initializeDocument(data);
  }

  _initializeDocument(data) {
    PDFDocument.load(data).then((doc) => {
      this.doc = doc;
      this.pages = doc.getPages();
    });
  }

  getAllIndirectObjects() {
    return _.toArray(this.doc.context.indirectObjects.entries()).map(([_, e]) => PDFObjToDict(e));
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

  deleteOutline() {
    //TODO
  }

  /**
   * outlineDict expects an outline of the form:
   * [
   *  {
   *   title: "Title",
   *   dest: PDFArray([PDFPage, "/XYZ", x?, y?, z?])
   *   children: [{}, {}, ...]
   *  }, {}, ...
   * ]
   */
  createOutline(outlineDict) {
    //TODO
    // generate all refs up front
    // associate refs with outline.
    // generate outline notes
    // add outline nodes to tree
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

  _createOutlineItem(title, parent, next, prev, pageRef) {
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
