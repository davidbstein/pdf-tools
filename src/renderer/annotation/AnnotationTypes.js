/**
 * AnnotationTypes describe a kind of annotation "marker".
 * name: [optional] string - the name of the marker
 * color: [{r,g,b} | #rrggbb] - the color of the marker, [0-1]
 * type: Highlight | Underline | Squiggly | Strikeout | Link | FreeText | Popup | Line
 */
import { colorToRGB, colorToHex } from "./AnnotationHelpers";
import { getConfig } from "@/../common/defaults";
export const ToolTypes = {
  HIGHLIGHT: "HIGHLIGHT",
  UNDERLINE: "UNDERLINE",
  SQUIGGLY: "SQUIGGLY",
  STRIKEOUT: "STRIKEOUT",
  LINK: "LINK",
  FREE_TEXT: "FREETEXT",
  POPUP: "POPUP",
  LINE: "LINE",
  OUTLINE: "OUTLINE",
  CROP: "CROP",
  ERASER: "ERASER",
};

export const ToolCategories = {
  MARKUP_TYPES: [ToolTypes.HIGHLIGHT, ToolTypes.UNDERLINE, ToolTypes.SQUIGGLY, ToolTypes.STRIKEOUT],
  DRAWING_TYPES: [ToolTypes.LINE, ToolTypes.FREE_TEXT],
  METADATA_TYPES: [ToolTypes.LINK, ToolTypes.POPUP],
  EDITOR_TYPES: [ToolTypes.OUTLINE, ToolTypes.CROP, ToolTypes.ERASER],
};

export const ToolList = getConfig("DEFAULT_TOOL_LIST").map(function (annotationType) {
  return {
    ...annotationType,
    color: colorToRGB(annotationType.color ? annotationType.color : "#0000ff"),
    colorHex: colorToHex(annotationType.color ? annotationType.color : "#0000ff"),
  };
});
