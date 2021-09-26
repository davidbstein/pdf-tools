import _ from "lodash";
import fs from "fs";

/**
 * given a javascript selection, return a list of text nodes in the selection
 * @param {Selection} selection
 */
export function selectionToNodes(selection) {
  const nodes = [];
  const range = selection.getRangeAt(0);
  const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  // split the first and last element if they are not in the selection, then remove them from the nodelist
  if (nodes.length == 0) return [];
  if (range.startOffset) {
    nodes[0] = nodes[0].splitText(range.startOffset);
  }
  if (range.endOffset < nodes[nodes.length - 1].length) {
    nodes[nodes.length - 1].splitText(range.endOffset);
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

function quadPointToRect([x1, y1, x2, y2, x3, y3, x4, y4], pageRect) {
  const x = Math.min(x1, x2, x3, x4);
  const y = Math.min(y1, y2, y3, y4);
  const width = Math.max(x1, x2, x3, x4) - x;
  const height = Math.max(y1, y2, y3, y4) - y;
  return {
    bottom: y,
    top: pageRect.height - y - height,
    left: x,
    right: pageRect.width - x - width,
  };
}

function quadPointArrayToRects(quadPointArray, pageRect) {
  return _.chunk(quadPointArray, 8).map((quad) => quadPointToRect(quad, pageRect));
}

function getPageDiv(pageNum) {
  for (let page of document.getElementsByClassName("page")) {
    if (page.getAttribute("data-page-number") == pageNum) return page;
  }
}

export function renderAnnotationDivs({
  author,
  border,
  color,
  id,
  object_id,
  page: pageNum,
  opacity,
  quadPoints,
}) {
  const pageDiv = getPageDiv(pageNum);
  const pageRect = pageDiv.getBoundingClientRect();
  const rects = quadPointArrayToRects(quadPoints, pageRect);
  return rects.map((rect, idx) => {
    const div = document.createElement("div");
    div.classList.add("unsaved-annotation");
    div.id = `${id}-${idx}`;
    div.style.background = `rgba(${255 * color.r}, ${255 * color.g}, ${255 * color.b}, ${opacity})`;
    div.style.left = `${rect.left}px`;
    div.style.top = `${rect.top}px`;
    div.style.bottom = `${rect.bottom}px`;
    div.style.right = `${rect.right}px`;
    div.dataset.id = id;
    div.onclick = (e) => {
      console.log(e);
    };
    pageDiv.prepend(div);
    return div;
  });
}

/**
 * given a node, a pdf "quadPoint" array, which gives the x,y coordinates of each corner of the rectangle,
 * left to right, bottom to top. x and y are measured from the bottom right hand corner of the page.
 *
 * Adjusted for scale.
 * @param {Node} node
 * @returns {Object} [bottomLeftX, bottomLeftY, bottomRightX, bottomRightY, topLeftX, topLeftY, topRightX, topRightY]
 */
export function nodeToQuadpoint(node, pageDiv, scale = 1) {
  const nodeRect = getTextNodeBoundingRect(node);
  const pageRect = pageDiv.getBoundingClientRect();
  const x = nodeRect.left - pageRect.left;
  const y = pageRect.bottom - nodeRect.bottom;
  const width = nodeRect.width;
  const height = nodeRect.height;
  const quadPoint = [x, y, x + width, y, x, y + height, x + width, y + height];
  console.log({ nodeRect, pageRect, x, y, width, height, quadPoint });
  const scaledQuadPoint = quadPoint.map((point) => point / scale);
  return scaledQuadPoint;
}

export function currentSelection() {
  const selection = window.getSelection();
  const nodes = selectionToNodes(selection);
  if (nodes.length == 0) return null;
  const pageDiv = getAncestorWithClass(nodes[0], "page");
  const endpageDiv = getAncestorWithClass(nodes[nodes.length - 1], "page");
  if (pageDiv != endpageDiv) {
    throw new Error("selection spans multiple pages");
  }
  const quadPoints = nodes.map((node) => nodeToQuadpoint(node, pageDiv, window._pdf._scale));
  return {
    pageDiv,
    pageNumber: pageDiv.getAttribute("data-page-number"),
    quadPoints: _.flatten(quadPoints),
    text: selection.getRangeAt(0).toString(),
  };
}
