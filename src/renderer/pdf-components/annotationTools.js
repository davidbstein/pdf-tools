import _ from "lodash";
import { AnnotationFactory } from "annotpdf";

/**
 * Other annotpdf options (copied from annotpdf documentation)
 * {
 *          updateDate: Date // Specify an update date for the annotation
 *          annotationFlags: { // Specify the behavior of annotations
 *                  invisible: boolean // Do not display annotation
 *                  hidden: boolean // Do not display or print annotation
 *                  print: boolean // Do not print annotation
 *                  noZoom: boolean // Do not scale annotation, when zooming
 *                  noRotate: boolean // Do not rotate annotation, when page is rotated
 *                  noView: boolean // Disable interaction and display of the annotation
 *                  readOnly: boolean
 *                  locked?: boolean
 *                  toggleNoView: boolean // inverts noView option
 *                  lockedContents: boolean // Lock content of the annotation
 *          }
 *          border: { // Specify the appearance of the border; Note that not every option is available on every annotation
 *                  horizontal_corner_radius: number
 *                  vertical_corner_radius: number
 *                  border_width: number
 *                  dash_pattern: number[] // See specification for more information
 *                  border_style: BorderStyles.Solid | BorderStyles.Dashed | BorderStyles.Beveled | BorderStyles.Inset | BorderStyles.Underline // define a border style
 *                  cloudy: boolean // Smear the border
 *                  cloud_intensity: number // Intensity of the smearing
 *          }
 *          color: {r : number, g : number, b : number} // Specify the color can be the background color, the title bar color, the border color, depending on the annotation type
 *  }
 *  Markup annotations are: Text, FreeText, Line, Square, Circle, Polygon, PolyLine, Highlight, Underline, Squiggly, StrikeOut, Stamp, Caret, Ink, FileAttachment, Sound, Redact
 *  {
 *              opacity: number // A number in the interval [0, 1] to control the opacity
 *              richtextString: string // Is displayed in the pop up window, when the annotation is opened
 *              creationDate: Date // Specify a creation date
 *              subject: string // A short description of the subject that is referred in the annotation
 *              intent: string // The intent of the annotation
 *  }
 */

/**
 * given a javascript selection, return a list of nodes in the selection
 * @param {Selection} selection
 */
function selectionToNotes(selection) {
  const nodes = [];
  selection.getRangeAt(0).childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      nodes.push(node);
    }
  });
  return nodes;
}

/**
 * first the first ancestor with a given class
 */
function getAncestorWithClass(node, className) {
  let ancestor = node;
  while (ancestor.parentNode) {
    if (ancestor.classList.contains(className)) return ancestor;
    ancestor = ancestor.parentNode;
  }
  return null;
}

/**
 * given a node, a pdf "quadPoint" array, which gives the x,y coordinates of each corner of the rectangle,
 * left to right, bottom to top. x and y are measured from the bottom right hand corner of the page.
 *
 * Adjusted for scale.
 * @param {Node} node
 * @returns {Object} [bottomLeftX, bottomLeftY, bottomRightX, bottomRightY, topLeftX, topLeftY, topRightX, topRightY]
 */
function nodeToQuadpoint(node, scale) {
  const rect = node.getBoundingClientRect();
  const page = getAncestorWithClass(node, "page");
  const pageRect = page.getBoundingClientRect();
  const x = rect.left - pageRect.left;
  const y = rect.bottom - pageRect.bottom;
  const width = rect.width;
  const height = rect.height;
  const quadPoint = [x, y, x + width, y, x, y + height, x + width, y + height];
  const scaledQuadPoint = quadPoint.map((point) => point / scale);
  return scaledQuadPoint;
}

function selectionToHighlight(selection) {}

export default class HighlightManager {
  constructor(pdfViewer, data) {
    this._pdf = pdfViewer;
    this._pdf._doc.getData().then((data) => {
      this._annotationFactory = new AnnotationFactory(data);
    });
    document.addEventListener(
      "selectionchange",
      _.debounce(
        (e) => {
          console.log("selection - ", window.getSelection());
        },
        1000,
        { trailing: true }
      )
    );
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
    this._annotationFactory.createHighlightAnnotation({
      page,
      rect,
      contents,
      author,
      color: { r, g, b, a },
      opacity,
      quadPoints,
    });
  }

  /**
   * see `highlight` for input format
   */
  underline(page, [x1, y1, x2, y2], contents, author, { r, g, b }, opacity, quadPoints) {
    this._annotationFactory.createUnderlineAnnotation({
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
    this._annotationFactory.createSquareAnnotation({
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
    this._annotationFactory.createFreeTextAnnotation({
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
