import _ from "lodash";
import fs from "fs";
import { HighlightAnnotation } from "pdfjs-dist/build/pdf.worker";
import { Logger } from "../../helpers";
import { colorToHex } from "./colorTools";

const logger = new Logger("AnnotationHelper");

/**
 * given a javascript selection, return a list of text nodes in the selection
 * @param {Selection} selection
 */
export function selectionToNodes(selection) {
  const nodes = [];
  if (selection.rangeCount == 0) return nodes;
  const range = selection.getRangeAt(0);
  if (range.startContainer == range.endContainer) {
    nodes.push(range.startContainer);
  } else {
    const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
  }
  // split the first and last element if they are not in the selection, then remove them from the nodelist
  if (nodes.length == 0) return [];
  if (range.endOffset < nodes[nodes.length - 1].length) {
    nodes[nodes.length - 1].splitText(range.endOffset);
  }
  if (range.startOffset) {
    nodes[0] = nodes[0].splitText(range.startOffset);
  }
  return nodes;
}

/**
 * first the first ancestor with a given class
 */
export function getAncestorWithClass(node, className) {
  let ancestor = node;
  while (ancestor.parentElement) {
    ancestor = ancestor.parentElement;
    if (ancestor.classList.contains(className)) return ancestor;
  }
  return null;
}

export function getTextNodeBoundingRect(node) {
  const range = document.createRange();
  range.selectNode(node);
  const rect = range.getBoundingClientRect();
  range.detach();
  return rect;
}

function quadPointToRect([x1, y1, x2, y2, x3, y3, x4, y4], pageLeaf) {
  const mediabox = pageLeaf.MediaBox()?.array.map((n) => n.value());
  const cropbox = pageLeaf.CropBox()?.array.map((n) => n.value());
  const [xmin, ymin, xmax, ymax] = cropbox || mediabox;
  const ys = _.sortBy([y1, y2, y3, y4]);
  const xs = _.sortBy([x1, x2, x3, x4]);
  const rect = {
    bottom: (100 * (ys[0] - ymin)) / (ymax - ymin),
    left: (100 * (xs[0] - xmin)) / (xmax - xmin),
    top: (100 * (ymax - ys[3])) / (ymax - ymin),
    right: (100 * (xmax - xs[3])) / (xmax - xmin),
  };
  return rect;
}

function quadPointArrayToRects(quadPointArray, pageRect) {
  return _.chunk(quadPointArray, 8).map((quad) => quadPointToRect(quad, pageRect));
}

export function annotationToDivs(annotationDict, pageLeaf) {
  if (["/Highlight", "/Underline"].indexOf(annotationDict["/Subtype"]) < 0) return [];
  const divs = [];
  for (let rect of quadPointArrayToRects(annotationDict["/QuadPoints"], pageLeaf)) {
    const refNumber = annotationDict.ref.objectNumber;
    const color = colorToHex(annotationDict["/C"]);
    const div = document.createElement("div");
    div.setAttribute("data-annotation-id", `${refNumber}R`);
    div.classList = `highlight-annotation annotation-ref-${refNumber}R`;
    div.style.top = `${rect.top}%`;
    div.style.left = `${rect.left}%`;
    div.style.bottom = `${rect.bottom}%`;
    div.style.right = `${rect.right}%`;
    if (annotationDict["/Subtype"] === "/Highlight") {
      div.style.backgroundColor = color;
      div.classList.add("highlight-annot-subtype");
    }
    if (annotationDict["/Subtype"] === "/Underline") {
      div.style.borderBottom = `2px solid ${color}`;
      div.style.backgroundColor = "transparent";
      div.classList.add("underline-annot-subtype");
    }
    div.style.opacity = annotationDict["/CA"];
    divs.push(div);
  }
  return divs;
}

function quadPointArrayToBoundingRect(quadPointArray) {
  const quads = _.chunk(quadPointArray, 2);
  const rawRect = {
    xmin: _.min(quads.map(([x, y]) => x)),
    xmax: _.max(quads.map(([x, y]) => x)),
    ymin: _.min(quads.map(([x, y]) => y)),
    ymax: _.max(quads.map(([x, y]) => y)),
  };
  return [rawRect.xmin, rawRect.ymin, rawRect.xmax - rawRect.xmin, rawRect.ymax - rawRect.ymin];
}

function getPageDiv(pageNum) {
  for (let page of document.getElementsByClassName("page")) {
    if (page.getAttribute("data-page-number") == pageNum) return page;
  }
}
/**
 * given a node, a pdf "quadPoint" array, which gives the x,y coordinates of each corner of the rectangle,
 * left to right, bottom to top. x and y are measured from the bottom right hand corner of the page.
 *
 * units are a float between 0 and 1, representing the percentage of the page width and height.
 *
 * @param {Node} node
 * @returns {Object} [bottomLeftX, bottomLeftY, bottomRightX, bottomRightY, topLeftX, topLeftY, topRightX, topRightY]
 */
export function nodeToQuadpoint(node, pageDiv, [minx, miny, maxx, maxy]) {
  const nodeRect = getTextNodeBoundingRect(node);
  const pageRect = pageDiv.getBoundingClientRect();
  const raw_x = (nodeRect.left - pageRect.left) / pageRect.width;
  const raw_y = (pageRect.bottom - nodeRect.bottom) / pageRect.height;
  const raw_width = nodeRect.width / pageRect.width;
  const raw_height = nodeRect.height / pageRect.height;
  const x = raw_x * (maxx - minx) + minx;
  const y = raw_y * (maxy - miny) + miny;
  const width = raw_width * (maxx - minx);
  const height = raw_height * (maxy - miny);
  const quadPoint = [x, y, x + width, y, x, y + height, x + width, y + height];
  return quadPoint;
}

const [_BotL_X, _BotL_Y, _BotR_X, _BotR_Y, _TopL_X, _TopL_Y, _TopR_X, _TopR_Y] = [
  0, 1, 2, 3, 4, 5, 6, 7,
];

/**
 * given a list of quadpoints describing rectangles:
 * first, remove any quadpoints that "jump" out of line
 * next, combine any quadpoints that share the same y coordinates.
 */
function smoothQuadpointArray(quadpointArray) {
  const cleanedArray = [];
  for (let i_ = 0; i_ < quadpointArray.length; i_++) {
    cleanedArray.push(quadpointArray[i_]);
    const current = quadpointArray[i_];
    const remaining = quadpointArray.slice(i_ + 1);
    const next_idx = _.findIndex(
      remaining,
      (test) => current[_BotR_Y] < test[_TopL_Y] && current[_TopR_Y] > test[_BotL_Y]
    );
    if (next_idx >= 0) i_ += next_idx;
  }
  const combinedArray = [cleanedArray[0]];
  for (let quad of cleanedArray.slice(1)) {
    const cur = combinedArray[combinedArray.length - 1];
    // current base is below next top and current top is above next base: extend current
    if (
      cur[_BotR_Y] < quad[_TopL_Y] &&
      cur[_TopR_Y] > quad[_BotL_Y] &&
      cur[_TopR_X] < quad[_TopR_X] &&
      cur[_BotR_X] < quad[_BotR_X]
    ) {
      cur[_BotR_X] = quad[_BotR_X];
      cur[_TopR_X] = quad[_TopR_X];
      cur[_BotR_Y] = quad[_BotR_Y];
      cur[_TopR_Y] = quad[_TopR_Y];
    } else {
      combinedArray.push(quad);
    }
  }
  return combinedArray;
}

export function getSelectionPageNumber({ pageDiv }) {
  const pageNumber = pageDiv.getAttribute("data-page-number");
  return pageNumber;
}

export function currentSelection(doc) {
  const selection = window.getSelection();
  const nodes = selectionToNodes(selection);
  if (nodes.length == 0) return null;
  const pageDiv = getAncestorWithClass(nodes[0], "page");
  const endpageDiv = getAncestorWithClass(nodes[nodes.length - 1], "page");
  if (pageDiv != endpageDiv) {
    throw new Error("selection spans multiple pages");
  }

  const pageNumber = pageDiv.getAttribute("data-page-number");
  const pageIdx = pageDiv.getAttribute("data-page-number") - 1; //TODO numbering can be weird...
  const leaf = doc.pages[pageIdx].node;
  const mediabox = leaf.MediaBox()?.array.map((n) => n.value());
  const cropbox = leaf.CropBox()?.array.map((n) => n.value());

  const quadPoints = _.flatten(
    smoothQuadpointArray(nodes.map((node) => nodeToQuadpoint(node, pageDiv, cropbox || mediabox)))
  );
  return {
    pageDiv,
    pageNumber,
    pageIdx,
    rect: quadPointArrayToBoundingRect(quadPoints),
    quadPoints: quadPoints,
    text: selection.getRangeAt(0).toString(),
  };
}
