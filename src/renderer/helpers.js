import CryptoJS from "crypto-js";

/**
 * generate three different random numbers between 0 and 1 from a seed string, use those to
 * generate a #rrggbb color string
 */
function generateColorFromSeed(seed) {
  const hash = CryptoJS.MD5(seed);
  return (
    "#" +
    ((1 << 24) + hash.words.reduce((prev, cur) => (prev * cur) % 0xffffff)).toString(16).slice(1)
  );
}

function brightnessOfHexColor(color) {
  const rgb = parseInt(color.replace("#", ""), 16);
  const r = (rgb >> 0b10000) & 0xff;
  const g = (rgb >> 0b100) & 0xff;
  const b = (rgb >> 0b0) & 0xff;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * given two hex color strings of the form #RRGGBB - return the average of the two colors
 */
function averageColor(color1, color2, weight = 0.7) {
  const rgb1 = parseInt(color1.replace("#", ""), 16);
  const rgb2 = parseInt(color2.replace("#", ""), 16);
  const r = (rgb1 >> 0b10000) & 0xff;
  const g = (rgb1 >> 0b100) & 0xff;
  const b = (rgb1 >> 0b0) & 0xff;
  const r2 = (rgb2 >> 0b10000) & 0xff;
  const g2 = (rgb2 >> 0b100) & 0xff;
  const b2 = (rgb2 >> 0b0) & 0xff;
  const r3 = Math.round(r * (1 - weight) + r2 * weight);
  const g3 = Math.round(g * (1 - weight) + g2 * weight);
  const b3 = Math.round(b * (1 - weight) + b2 * weight);
  return `#${[r3, g3, b3].map((x) => x.toString(16)).join("")}`;
}

const _callerRegexp = `at (?<path>(.+?\.)+(?<fnName>.*?)) (?<aliasInfo>\[as (?<aliasName>.+?)\])? `;
const _callerMatch = new RegExp(_callerRegexp);

function getCaller(trace) {
  const line = trace.split("\n")[1];
  const groups = {
    ...{
      path: "",
      fnName: "",
      aliasName: "",
      srcmapRow: "",
      srcmapCol: "",
      link: "",
    },
    ...line.match(/at (?<path>.+?\.)+(?<fnName>.*?)[ $]/)?.groups,
    ...line.match(/\[as(?<aliasName> .+?)\]/)?.groups,
    ...line.match(/\((?<link>.+?\:(?<srcmapRow>\d+)\:(?<srcmapCol>\d+)\))/)?.groups,
  };
  return groups;
}

/**
 * logs to console, adding a timestamp, the label of the file, the line number
 * if the only argument is a string, set the color to red
 * include the stacktrace in a collapsed group.
 */
export class Logger {
  constructor(label, { color, debug = false } = {}) {
    this.label = label;
    const t = 0.2; // brightness target constant. 0<t<.5;
    // if no color is provided, generate a color based on the label
    const c = color || generateColorFromSeed(label);
    const b = brightnessOfHexColor(c) / 256;
    const colorWeight = Math.min(1, Math.max(0, (1 - t) / b));
    const backgroundWeight = Math.min(1, Math.max(0, t / b));
    this.color = averageColor("#ffffff", c, colorWeight);
    this.backgroundColor = averageColor("#000000", c, backgroundWeight);
    window.VERBOSE = true;
  }

  getStackTrace() {
    const minifiedStack = new Error().stack;
    const stack = minifiedStack; //await sourceStackTrace.mapStackTrace(minifiedStack);
    const lines = stack.split("\n");
    const stackTrace = lines.slice(3);
    return stackTrace.join("\n");
  }

  _subcall(method, color, bg, args, force = false) {
    if (window.VERBOSE == false) return;
    if (force || this.debug) {
      const trace = this.getStackTrace();
      const caller = getCaller(trace);
      const spacer = " ".repeat(Math.max(0, 8 - method.length));
      const marker = `[${method}${spacer}${new Date().toLocaleTimeString()}]`;
      const callerLabel = `[${this.label}.${caller.fnName}${caller.aliasName}:${caller.srcmapRow}:${caller.srcmapCol}]`;
      const preview = typeof args[0] == "string" ? args[0] : "<object>";
      const link = `(${caller.link})`;
      console.groupCollapsed(
        `%c${marker}%c %c${callerLabel} %c${preview}%c${link}`,
        `color: ${color}; background: ${bg};`, //marker
        `color: default; background: default;`, //space
        `color: ${this.color}; background: ${this.backgroundColor};`, //caller
        `color: white; background: ${bg};`, //preview
        `color: default; font-size: .8em; text-align: right; padding-left: 4em;` //link
      );
      console.log(...args);
      console.warn(trace);
      console.groupEnd();
    }
  }

  log() {
    this._subcall("🪵 log", "#CCC", "#444", arguments, true);
  }

  debug() {
    this._subcall("🐞 debug", "#0F0", "#060", arguments);
  }

  warn() {
    this._subcall("🚧 warn", "#FF0", "#660", arguments);
  }

  info() {
    this._subcall("ℹ️ info", "#44F", "#006", arguments);
  }

  error() {
    this._subcall("🚨 error", "#F00", "#600", arguments);
  }
}

const eventLogger = new Logger("eventEmitter");

export function emitEvent(eventName, eventData, suppressLog = false) {
  const event = new CustomEvent(eventName, { detail: eventData });
  if (!suppressLog) eventLogger.debug(eventName, eventData);
  window.dispatchEvent(event);
}

export function boundValue(variable, [minVal, maxVal]) {
  return Math.min(Math.max(variable, minVal), maxVal);
}
