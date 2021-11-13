import _ from "lodash";

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
      return {
        r: (colorObject[0] == undefined ? colorObject.r : colorObject[0]) * 255,
        g: (colorObject[1] == undefined ? colorObject.g : colorObject[1]) * 255,
        b: (colorObject[2] == undefined ? colorObject.b : colorObject[2]) * 255,
      };
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
