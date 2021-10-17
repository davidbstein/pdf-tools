/**
 * AnnotationTypes describe a kind of annotation "marker".
 * name: [optional] string - the name of the marker
 * color: [{r,g,b} | #rrggbb] - the color of the marker, [0-1]
 * type: Highlight | Underline | Squiggly | Strikeout | Link | FreeText | Popup | Line
 */
import { colorToRGB, colorToHex } from "./AnnotationHelpers";

export const ToolTypes = {
  HIGHLIGHT: "Highlight",
  UNDERLINE: "Underline",
  SQUIGGLY: "Squiggly",
  STRIKEOUT: "Strikeout",
  LINK: "Link",
  FREE_TEXT: "FreeText",
  POPUP: "Popup",
  LINE: "Line",
  OUTLINE: "Outline",
  CROP: "Crop",
  ERASER: "Eraser",
};

export const ToolCategories = {
  MARKUP_TYPES: [ToolTypes.HIGHLIGHT, ToolTypes.UNDERLINE, ToolTypes.SQUIGGLY, ToolTypes.STRIKEOUT],
  DRAWING_TYPES: [ToolTypes.LINE, ToolTypes.FREE_TEXT],
  METADATA_TYPES: [ToolTypes.LINK, ToolTypes.POPUP],
  EDITOR_TYPES: [ToolTypes.OUTLINE, ToolTypes.CROP, ToolTypes.ERASER],
};

export const ToolList = [
  {
    name: "(notable)",
    color: "#FFFFaa",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Facts",
    color: "#FAF446",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Legal",
    color: "#FFC677",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Dissent",
    color: "#FFB5B0",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Disposition",
    color: "#94E3FC",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "History",
    color: "#D9C9FE",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Statute",
    color: "#F3A9FF",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Concurrences / Cites",
    color: "#deeed4",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Paper",
    color: "#D0D8FF",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Challenged Doc",
    color: "#F1F6B8",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Section ",
    color: "#000000",
    type: ToolTypes.UNDERLINE,
    underline_thickness: "2px",
  },
  {
    name: "Case Name",
    color: "#669c34",
    type: ToolTypes.UNDERLINE,
    underline_thickness: "1px",
  },
  {
    name: "Outline",
    type: ToolTypes.OUTLINE,
    color: "#0000ff",
  },
  {
    name: "Eraser",
    type: ToolTypes.ERASER,
    color: "#ffffff",
  },
].map(function (annotationType) {
  return {
    ...annotationType,
    color: colorToRGB(annotationType.color ? annotationType.color : "#0000ff"),
    colorHex: colorToHex(annotationType.color ? annotationType.color : "#0000ff"),
  };
});
