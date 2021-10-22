import CryptoJS from "crypto-js";
import * as sourceStackTrace from "sourcemapped-stacktrace";

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
  constructor(label, { color, debug = false } = {}) {
    this.label = label;
    // if no color is provided, generate a color based on the label
    this.color = color || generateColorFromSeed(label);
    const brightness = brightnessOfHexColor(this.color);
    this.backgroundColor = brightness < 128 ? "white" : "black";
  }

  async getStackTrace() {
    const minifiedStack = new Error().stack;
    const stack = minifiedStack; //await sourceStackTrace.mapStackTrace(minifiedStack);
    const lines = stack.split("\n");
    const stackTrace = lines.slice(3);
    return stackTrace.join("\n");
  }

  async log(...args) {
    console.groupCollapsed(
      `%c[${this.label}]`,
      `color: ${this.color}; background: ${this.backgroundColor};`,
      ...args
    );
    console.log(await this.getStackTrace());
    console.groupEnd();
    return;
  }

  _subcall(method, ...args) {
    if (this.debug) {
      console[method](
        `%c[${this.label} ${method}]`,
        `color: ${this.color}; background: ${this.backgroundColor};`,
        ...args
      );
      console.groupCollapsed();
      console[method](this.getStackTrace());
      console.groupEnd();
    }
  }

  debug(...args) {
    this._subcall("debug", ...args);
  }

  warn(...args) {
    this._subcall("warn", ...args);
  }

  info(...args) {
    this._subcall("info", ...args);
  }
}

const eventLogger = new Logger("eventEmitter");

export function emitEvent(eventName, eventData) {
  const event = new CustomEvent(eventName, { detail: eventData });
  eventLogger.log(eventName, eventData);
  window.dispatchEvent(event);
}
