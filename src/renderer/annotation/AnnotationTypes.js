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
};

export const ToolList = [
  {
    name: "Facts",
    color: "#fffab9",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Legal",
    color: "#fdd9a8",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Dissent",
    color: "#fedbd8",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Disposition",
    color: "#ccefff",
    opacity: 0.5,
    type: ToolTypes.HIGHLIGHT,
  },
  {
    name: "Procedure",
    color: "#f0caff",
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
    colorHex: colorToHex(annotationType.color),
  };
});
