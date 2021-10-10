/**
 * AnnotationTypes describe a kind of annotation "marker".
 * name: [optional] string - the name of the marker
 * color: [{r,g,b} | #rrggbb] - the color of the marker, [0-1]
 * type: Highlight | Underline | Squiggly | Strikeout | Link | FreeText | Popup | Line
 */
import { colorToRGB } from "./AnnotationHelpers";

export const ToolTypes = {
  HIGHLIGHT: "Highlight",
  UNDERLINE: "Underline",
  SQUIGGLY: "Squiggly",
  STRIKEOUT: "Strikeout",
  LINK: "Link",
  FREE_TEXT: "FreeText",
  POPUP: "Popup",
  LINE: "Line",
};

export const ToolList = [
  {
    name: "Factual Content",
    color: "#fffab9",
    opacity: 0.25,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Legal Reasoning",
    color: "#fdd9a8",
    opacity: 0.25,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Rejected or Dissenting Reasoning",
    color: "#fedbd8",
    opacity: 0.25,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Disposition",
    color: "#ccefff",
    opacity: 0.25,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Procedural Posture",
    color: "#f0caff",
    opacity: 0.25,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Concurrences / Likely Dicta / Important Case Cites",
    color: "#deeed4",
    opacity: 0.25,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Section Underline",
    color: "#000000",
    type: ToolTypes.UNDERLINE,
    underline_thickness: "2px",
  },
  {
    name: "Case Name Underline",
    color: "#669c34",
    type: ToolTypes.UNDERLINE,
    underline_thickness: "1px",
  },
].map(function (annotationType) {
  return {
    ...annotationType,
    color: colorToRGB(annotationType.color),
  };
});
