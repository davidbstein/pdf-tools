import _ from "lodash";
import fs from "fs";
import { HighlightAnnotation } from "pdfjs-dist/build/pdf.worker";

/**
 * given a color of one of the following formats: {r: [0-255], g: [0-255], b: [0-255]};  {r: [0-1], g: [0-1], b: [0-1]}; #RRGGBB; or #RGB
 * returns a color {r: [0-255], g: [0-255], b: [0-255]}.
 */
export function colorToRGB(colorObject) {
  if (typeof colorObject === "string") {
    if (colorObject.startsWith("#")) {
      colorObject = colorObject.substring(1);
    }
    if (colorObject.length == 3) {
      colorObject = colorObject
        .split("")
        .map((c) => `${c}${c}`)
        .join("");
    }
    const color = parseInt(colorObject, 16);
    return {
      r: (color >> 16) & 255,
      g: (color >> 8) & 255,
      b: color & 255,
    };
  }
  if (typeof colorObject === "object") {
    if (_.max(_.values(colorObject)) > 1) {
      return { ...colorObject };
    } else {
      return { r: colorObject[0] * 255, g: colorObject[1] * 255, b: colorObject[2] * 255 };
    }
  }
  console.error(
    "colorToRGB: invalid color object",
    colorObject,
    typeof colorObject,
    "expected string or object"
  );
}

export function colorToHex(color, opacity) {
  const rgb = colorToRGB(color);
  const hexColor = "#" + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1);
  if (opacity) {
    let opacityHex = Math.round(256 + 255 * opacity)
      .toString(16)
      .slice(1);
    return `${hexColor}${opacityHex}`;
  }
  return hexColor;
}

/**
 * given a javascript selection, return a list of text nodes in the selection
 * @param {Selection} selection
 */
export function selectionToNodes(selection) {
  const nodes = [];
  if (selection.rangeCount == 0) return nodes;
  const range = selection.getRangeAt(0);
  const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  // split the first and last element if they are not in the selection, then remove them from the nodelist
  if (nodes.length == 0) {
    return [];
  }
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
  if (annotationDict["/Subtype"] != "/Highlight") return [];
  const divs = [];
  for (let rect of quadPointArrayToRects(annotationDict["/QuadPoints"], pageLeaf)) {
    const color = colorToHex(annotationDict["/C"]);
    const div = document.createElement("div");
    div.setAttribute("data-annotation-id", `${annotationDict.ref.objectNumber}R`);
    div.classList = ["highlight-annotation"];
    div.style.top = `${rect.top}%`;
    div.style.left = `${rect.left}%`;
    div.style.bottom = `${rect.bottom}%`;
    div.style.right = `${rect.right}%`;
    div.style.backgroundColor = color;
    div.style.opacity = annotationDict["/CA"];
    div.onclick = () => {
      console.log(annotationDict);
    };
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
    nodes.map((node) => nodeToQuadpoint(node, pageDiv, cropbox || mediabox))
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
