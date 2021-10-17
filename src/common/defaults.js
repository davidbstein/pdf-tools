import fs from "fs";
import os from "os";

/**
 * if it exists, loads the json file .stein-pdf-settings.json from the home directory
 */
function readConfig() {
  try {
    const config = fs.readFileSync(`${os.homedir()}/.pdf-settings.json`, "utf8");
    return JSON.parse(config);
  } catch (e) {
    return {};
  }
}

function readDefaultConfig() {
  try {
    const config = fs.readFileSync(`${__dirname}/../../default-pdf-settings.json`, "utf8");
    return JSON.parse(config);
  } catch (e) {
    return {};
  }
}

const _CONFIG = readConfig();
const _DEFAULT_CONFIG = readDefaultConfig();

/**
 * gets a variable from the reference config in the root of this project, or the default value if it doesn't exist
 */
export function getConfig(key) {
  return _CONFIG[key] || _DEFAULT_CONFIG[key];
}
