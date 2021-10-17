import CryptoJS from "crypto-js";

/**
 * generate three different random numbers between 0 and 1 from a seed string, use those to
 * generate a #rrggbb color string
 */
function generateColorFromSeed(seed) {
  const hash = CryptoJS.MD5(seed);
  const [r, g, b] = hash.words.slice(0, 3).map((x) => x & 0xff);
  return "#" + ((1 << 24) + r * 0x010000 + g * 0x100 + b * 0x1).toString(16).slice(1);
}

function brightnessOfHexColor(color) {
  const rgb = parseInt(color.replace("#", ""), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * logs to console, adding a timestamp, the label of the file, the line number
 * if the only argument is a string, set the color to red
 * include the stacktrace in a collapsed group.
 */
export class Logger {
  constructor(label, color) {
    this.label = label;
    // if no color is provided, generate a color based on the label
    this.color = color || generateColorFromSeed(label);
    const brightness = brightnessOfHexColor(this.color);
    this.backgroundColor = brightness < 128 ? "white" : "black";
  }

  getStackTrace() {
    const stack = new Error().stack;
    const lines = stack.split("\n");
    const stackTrace = lines.slice(3);
    return stackTrace.join("\n");
  }

  call(...args) {
    console.groupCollapsed(
      `%c[${this.label}]`,
      `color: ${this.color}; background: ${this.backgroundColor}`,
      ...args
    );
    console.log(this.getStackTrace());
    console.groupEnd();
    return;
  }

  log(...args) {
    this.call(...args);
    return;
  }
}

const eventLogger = new Logger("eventEmitter");

export function emitEvent(eventName, eventData) {
  const event = new CustomEvent(eventName, { detail: eventData });
  eventLogger.log(eventName, eventData);
  window.dispatchEvent(event);
}
