import util from "node:util";

const logPrefixFormat = `${util.styleText(["black", "bgGreenBright"], "%s")}  %s%s`;

function getTimestamp() {
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return [hours, minutes, seconds].join(":").padEnd(10);
}

export function getLogPrefix(title: string, level: string) {
  const paddedTitle = title.padStart(title.length + 1).padEnd(title.length + 2);

  const paddedTimestamp =
    level === "Warning"
      ? util.styleText("yellow", getTimestamp().padEnd(10))
      : level === "Error"
        ? util.styleText("red", getTimestamp().padEnd(10))
        : getTimestamp().padEnd(10);
  const paddedLevel =
    level === "Warning"
      ? util.styleText("yellow", level.padEnd(10))
      : level === "Error"
        ? util.styleText("red", level.padEnd(10))
        : level.padEnd(10);
  return util.format(logPrefixFormat, paddedTitle, paddedTimestamp, paddedLevel);
}

function formatObject(object?: object) {
  let output;
  if (
    object === null ||
    object === undefined ||
    typeof object === "bigint" ||
    typeof object === "boolean" ||
    typeof object === "number" ||
    typeof object === "string"
  ) {
    output = object;
  } else if (typeof object === "function") {
    output = "[Function]";
  } else if (typeof object === "symbol") {
    output = {};
  } else if (typeof object === "object") {
    if (Array.isArray(object)) {
      const outputArray = object;
      output = outputArray;
    } else {
      const outputObject = object;
      (outputObject as util.Inspectable)[util.inspect.custom] = (_depth, _options, _inspect) => {
        const obj: Record<string, any> = {};
        Object.entries(object).forEach(([key, value]) => {
          obj[key] = value;
        });

        if (Object.keys(obj).length === 0) {
          return util.format(obj);
        }

        return util
          .format(obj)
          .replace(/\[Function:[^\]]*\]/g, "[Function]")
          .replace(/^\{[^\w]*/, "{ ")
          .replace(/\n\}$/, " }");
      };
      output = outputObject;
    }
  } else {
    output = object;
  }

  return output;
}

// https://developers.google.com/apps-script/reference/base/console
export class Console {
  readonly #logTitle: string;
  readonly #timer: Map<string, number>;

  constructor() {
    this.#logTitle = "console(GAS)";
    this.#timer = new Map();
  }

  error = (formatOrObject?: object, ...values: object[]) => {
    let outputLog = getLogPrefix(this.#logTitle, "Error");
    outputLog += util.format(
      util.styleText("red", "%s"),
      values.length === 0
        ? formatObject(formatOrObject)
        : util.format(formatOrObject, ...values.map((val) => formatObject(val))),
    );
    console.error(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
  };
  info = (formatOrObject?: object, ...values: object[]) => {
    let outputLog = getLogPrefix(this.#logTitle, "Info");
    outputLog += util.format(
      "%s",
      values.length === 0
        ? formatObject(formatOrObject)
        : util.format(formatOrObject, ...values.map((val) => formatObject(val))),
    );
    console.info(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
  };
  log = (formatOrObject?: any, ...values: object[]) => {
    let outputLog = getLogPrefix(this.#logTitle, "Info");
    outputLog += util.format(
      "%s",
      values.length === 0
        ? formatObject(formatOrObject)
        : util.format(formatOrObject, ...values.map((val) => formatObject(val))),
    );
    console.debug(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
  };
  time = (label: string) => {
    this.#timer.set(label, performance.now());
  };
  timeEnd = (label: string) => {
    const endTime = performance.now();
    const startTime = this.#timer.get(label);
    if (startTime) {
      let outputLog = getLogPrefix(this.#logTitle, "Debug");
      outputLog += util.format("%s: %dms", label, (endTime - startTime).toFixed(0));
      console.log(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
    }
  };
  warn = (formatOrObject?: object, ...values: object[]) => {
    let outputLog = getLogPrefix(this.#logTitle, "Warning");
    outputLog += util.format(
      util.styleText("yellow", "%s"),
      values.length === 0
        ? formatObject(formatOrObject)
        : util.format(formatOrObject, ...values.map((val) => formatObject(val))),
    );
    console.warn(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
  };
}
