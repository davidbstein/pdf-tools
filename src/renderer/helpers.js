import CryptoJS from "crypto-js";

/**
 * generate three different random numbers between 0 and 1 from a seed string, use those to
 * generate a #rrggbb color string
 */
function generateColorFromSeed(seed) {
  const hash = CryptoJS.MD5(seed);
  const [r, g, b] = hash.words.slice(0, 3).map((x) => x % 256);
  return "#" + ((1 << 24) + r * 0xffffff + g * 0xffff + b * 0xff).toString(16).slice(1);
}

/**
 * logs to console, adding a timestamp, the label of the file, the line number
 * if the only argument is a string, set the color to red
 * include the stacktrace in a collapsed group.
 */
export default class Logger {
  constructor(label, color) {
    this.label = label;
    // if no color is provided, generate a color based on the label
    this.color = color || generateColorFromSeed(label);
  }

  getStackTrace() {
    const stack = new Error().stack;
    const lines = stack.split("\n");
    const stackTrace = lines.slice(3);
    return stackTrace.join("\n");
  }

  call(...args) {
    console.groupCollapsed(`%c[${this.label}]`, `color: ${this.color}`, ...args);
    console.log(this.getStackTrace());
    console.groupEnd();
    return;
  }

  log(...args) {
    this.call(...args);
    return;
  }
}
