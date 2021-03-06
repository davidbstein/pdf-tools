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
  PDFHexString,
} from "pdf-lib";
import { node } from "prop-types";
import { emitEvent, Logger, boundValue } from "@/helpers";
import { colorToHex } from "./annotationHelpers/colorTools";
import _ from "lodash";

const logger = new Logger("DocProxy");

const _STEIN_PDF_INFO_KEY = PDFName.of("steinpdfviewinfo");

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
  static async createDocProxy(data) {
    const loadTask = PDFDocument.load(data);
    const doc = await loadTask;
    return new DocProxy(doc);
  }

  constructor(doc) {
    const _methods = Object.getOwnPropertyNames(this.__proto__);
    for (let _method of _methods)
      this[_method] = _method != "constructor" ? this[_method].bind(this) : 0;
    this.doc = doc;
    this.pages = doc.getPages();
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

  listIndirectObjects() {
    return _.toArray(this.doc.context.indirectObjects.entries()).map(([_, e]) => PDFObjToDict(e));
  }

  listOutlines() {
    return this.listIndirectObjects()
      .filter(
        (obj) => obj["/Type"] === "/Outlines" || (obj["/First"] && obj["/Last"] && !obj["/Parent"])
      )
      .map(this._rootToOutline);
  }

  _serializeOutlineNode(outlineNode) {
    return {
      title: outlineNode.title,
      children: outlineNode.children.map((child) => this._serializeOutlineNode(child)),
      pageIdx: outlineNode.pageIdx,
    };
  }

  listSerializableOutlines() {
    const outlines = this.listOutlines();
    return outlines.map(this._serializeOutlineNode);
  }

  listPageRefs() {
    return this.pages.map((page) => page.ref);
  }

  _rootToOutline(node, parent) {
    const children = [];

    if (node["/Title"]?.tag) node["/Title"] = PDFObjToDict(this.lookup(node["/Title"].ref));
    if (node["/A"]?.tag)
      logger.warn("this outline object is a link: ", PDFObjToDict(this.lookup(node["/A"].ref)));

    if (node["/First"]) {
      let current = this.lookupDict(node["/First"]);
      while (true) {
        children.push(this._rootToOutline(current, node));
        if (current["/Next"]) current = this.lookupDict(current["/Next"]);
        else break;
      }
    }
    return {
      node,
      title: node["/Title"],
      children,
      dest: node["/Dest"],
      pageIdx: this.listPageRefs().indexOf(node["/Dest"]?.[0].ref),
    };
  }

  updateMaxObjectNumber() {
    let maxObjectNumber = 0;
    for (let [entry, _] of this.doc.context.indirectObjects.entries())
      maxObjectNumber = Math.max(maxObjectNumber, entry.objectNumber);
    this.doc.context.largestObjectNumber = maxObjectNumber;
    logger.info(`reset max object number to: ${maxObjectNumber}`);
  }

  deleteOutline(outlineRoot, shouldUpdateMaxObjectNumber = false) {
    for (let node of outlineRoot.children) this.deleteOutline(node, false);
    const ref = this.doc.context.getObjectRef(outlineRoot.node.__obj);
    this.doc.context.delete(ref);
    if (shouldUpdateMaxObjectNumber) this.updateMaxObjectNumber();
    this.doc.flush();
  }

  removeOutlines() {
    const outlines = this.listOutlines();
    for (let outline of outlines) this.deleteOutline(outline);
  }

  _genDest(page, context) {
    const [pageIdx, destDict] = [
      typeof page === "number" ? page : page[0],
      typeof page === "number" ? { type: "XYZ", args: [null, null, null] } : page[1],
    ];
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
   *   pageIdx: pageIdx | [pageIdx, {type, args]}]
   *   children: [{}, {}, ...]
   *  }, {}, ...
   * ]
   */
  createOutline(outline) {
    logger.info(`largestObjectNumber = ${this.doc.context.largestObjectNumber}`);
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
        if (current.pageIdx != undefined)
          current.info.dest = this._genDest(current.pageIdx, this.doc.context);
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
    // initialize Map that will become the PDFDict
    console.groupCollapsed(" ~created outline!~ ");
    for (let { info, ...rest } of all_items) {
      logger.info(">>", info);
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
      logger.info(dict.toString()); //, _.fromPairs(Array.from(map.entries(), (e) => e)));
    }
    logger.info(this.doc.catalog.toString());
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

  streamDocAsBytes(options) {
    return this.doc.save({ useObjectStreams: true });
  }

  /**
   * type: Highlight,  Underline,  Squiggly
   * QuadPoints: [x1, y1, x2, y2, x3, y3, x4, y4 ...]
   */
  createHighlight({ pageIdx, color, opacity, quadPoints, rect = [0, 0, 0, 0], type }) {
    const page = this.pages[pageIdx];
    const pageRef = page.ref;
    const pageLeaf = this.lookup(page.ref);
    const highlightDict = this.doc.context.obj({
      Type: "Annot",
      Subtype: type,
      QuadPoints: quadPoints,
      Rect: rect,
      C: [color.r / 255, color.g / 255, color.b / 255],
      CA: opacity,
      P: pageRef,
      T: PDFString.of("highlight 'user'"),
    });
    return this.addAnnotation(highlightDict);
  }

  createAnnotationFunctions(highlightDict, ref) {
    const pageRef = highlightDict.dict.get(PDFName.of("P"));
    const pageLeaf = this.lookup(pageRef);
    const pageIdx = _.indexOf(
      this.pages.map((p) => p.ref.tag),
      pageRef.tag
    );
    const params = {
      ref,
      pageIdx,
    };
    const context = this.doc.context;
    logger.info(params, pageLeaf.ref, pageRef);
    return {
      removeFn: () => {
        logger.info("remove highlight");
        pageLeaf.removeAnnot(params.ref);
        params.ref = null;
      },
      addFn: () => {
        logger.info("add highlight");
        const highlightRef = context.register(highlightDict);
        params.ref = highlightRef;
        pageLeaf.addAnnot(highlightRef);
        logger.log("added", highlightRef);
      },
      params: params,
    };
  }

  addAnnotation(highlightDict) {
    const annotationFunctions = this.createAnnotationFunctions(highlightDict);
    logger.info(annotationFunctions);
    return {
      undoFn: annotationFunctions.removeFn,
      redoFn: annotationFunctions.addFn,
      params: annotationFunctions.params,
    };
  }

  removeAnnotation(ref) {
    const highlightDict = this.lookup(ref);
    const annotationFunctions = this.createAnnotationFunctions(highlightDict, ref);
    return {
      undoFn: annotationFunctions.addFn,
      redoFn: annotationFunctions.removeFn,
      params: annotationFunctions.params,
    };
  }

  _get_outline_as_list(outlineRoot, list = [], depth = 0) {
    const { children, ...info } = outlineRoot;
    list.push({ info: info, depth });
    if (children) {
      for (let child of children) {
        this._get_outline_as_list(child, list, depth + 1);
      }
    }
    return list;
  }

  _get_root_node_from_outline_list(outlineList) {
    const sortedOutlineList = _.orderBy(outlineList, ["info.pageIdx", "depth"]);
    const root = {
      _root: true,
      children: [],
    };
    for (let item of sortedOutlineList) {
      const { info, depth } = item;
      let current = root;
      for (let i = 1; i < depth; i++) {
        if (current.children.length > 0) current = current.children[current.children.length - 1];
      }
      if (depth > 0) {
        current.children.push({
          ...info,
          children: [],
        });
      }
    }
    return root;
  }

  _replace_outline(newOutline) {
    logger.log("new outline:", newOutline);
    this.removeOutlines();
    this.createOutline(newOutline);
    emitEvent("pdf-outline-changed");
  }

  _get_depth_of_previous_outline_item(outlineList, { title, pageIdx }) {
    return _.reduce(outlineList, (closest_item, current) => {
      if (current.info.pageIdx == pageIdx && current.info.title == title) return closest_item;
      if (current.info.pageIdx > pageIdx) return closest_item;
      if (current.info.pageIdx > closest_item.info.pageIdx) return current;
      if (current.info.pageIdx < closest_item.info.pageIdx) return closest_item;
      if (current.depth >= closest_item.depth) return current;
      return closest_item;
    }).depth;
  }

  addOutlineItem(title, pageIdx, depth_delta = 0) {
    const info = { title, pageIdx };
    const outlineRoot = this.listOutlines()?.[0] || this.createOutline([]);
    const outline = this._serializeOutlineNode(outlineRoot);
    const outlineList = this._get_outline_as_list(outline);
    const parentItemDepth = this._get_depth_of_previous_outline_item(outlineList, info);
    outlineList.push({
      info,
      depth: boundValue(parentItemDepth + depth_delta, [1, parentItemDepth + 2]),
    });
    const newList = outlineList.filter((o) => o.info.pageIdx >= 0 || o.depth == 0);
    const newOutline = this._get_root_node_from_outline_list(newList);
    return {
      undoFn: () => {
        this._replace_outline(outline.children);
      },
      redoFn: () => {
        this._replace_outline(newOutline.children);
      },
      params: info,
    };
  }

  removeOutlineItem(title, pageIdx) {
    const outlineRoot = this.listOutlines()?.[0] || this.createOutline([]);
    const outline = this._serializeOutlineNode(outlineRoot);
    const outlineList = this._get_outline_as_list(outline);
    const newList = outlineList.filter((o) => o.info.title != title || o.info.pageIdx != pageIdx);
    const newOutline = this._get_root_node_from_outline_list(newList);
    return {
      undoFn: () => {
        this._replace_outline(outline.children);
      },
      redoFn: () => {
        this._replace_outline(newOutline.children);
      },
      params: { title, pageIdx },
    };
  }

  changeOutlineItemDepth(title, pageIdx, direction = 1) {
    const outlineRoot = this.listOutlines()?.[0] || this.createOutline([]);
    const oldOutline = this._serializeOutlineNode(outlineRoot);
    const outline = this._serializeOutlineNode(outlineRoot);
    const outlineList = this._get_outline_as_list(outline);
    const item = _.find(outlineList, (o) => o.info.title == title && o.info.pageIdx == pageIdx);
    const maxItemDepth = this._get_depth_of_previous_outline_item(outlineList, item);
    // the "+2" is wrong. This is a stop-gap measure because I don't track position on the page
    // in outline info right now. I need to add that.
    item.depth = boundValue(item.depth + direction, [1, maxItemDepth + 2]);
    const newOutline = this._get_root_node_from_outline_list(outlineList);
    return {
      undoFn: () => {
        this._replace_outline(oldOutline.children);
      },
      redoFn: () => {
        this._replace_outline(newOutline.children);
      },
      params: { title, pageIdx },
    };
  }

  listHighlightsForPageIdx(pageIdx) {
    const page = this.pages[pageIdx];
    const pageRef = page.ref;
    const pageLeaf = this.lookup(page.ref);
    const highlights = pageLeaf.Annots()?.array.map((ref) => ({
      ...PDFObjToDict(this.lookup(ref)),
      ref,
    }));
    return {
      highlights: highlights || [],
      pageLeaf: pageLeaf,
    };
  }

  listHighlights() {
    const highlightTypes = ["/Highlight", "/Underline", "/Squiggly", "/StrikeOut"];
    return this.listIndirectObjects()
      .filter((a) => highlightTypes.indexOf(a?.["/Subtype"]) >= 0)
      .map((obj) => obj);
  }

  setCustomViewInfo(key, value) {
    const info = this.getCustomViewInfo();
    info[key] = value;
    logger.log("set custom view info", key, value);
    this.doc.getInfoDict().set(_STEIN_PDF_INFO_KEY, new PDFHexString(JSON.stringify(info)));
  }

  getCustomViewInfo() {
    try {
      const raw = this.doc.getInfoDict().get(_STEIN_PDF_INFO_KEY)?.value || "{}";
      return JSON.parse(raw);
    } catch (e) {
      logger.error(e);
      return {};
    }
  }
}
