import { format, inspect, Inspectable, styleText } from "node:util";

const logPrefixFormat = `${styleText(["black", "bgGreenBright"], "%s")}  %s%s`;

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
      ? styleText("yellow", getTimestamp().padEnd(10))
      : level === "Error"
        ? styleText("red", getTimestamp().padEnd(10))
        : getTimestamp().padEnd(10);
  const paddedLevel =
    level === "Warning"
      ? styleText("yellow", level.padEnd(10))
      : level === "Error"
        ? styleText("red", level.padEnd(10))
        : level.padEnd(10);
  return format(logPrefixFormat, paddedTitle, paddedTimestamp, paddedLevel);
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
      (outputObject as Inspectable)[inspect.custom] = (_depth, _options, _inspect) => {
        const obj: Record<string, any> = {};
        Object.entries(object).forEach(([key, value]) => {
          obj[key] = value;
        });

        if (Object.keys(obj).length === 0) {
          return format(obj);
        }

        return format(obj)
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
export function Console() {
  const logTitle = "console(GAS)";
  const timer = new Map<string, number>();

  return {
    error: function (formatOrObject?: object, ...values: object[]) {
      let outputLog = getLogPrefix(logTitle, "Error");
      outputLog += format(
        styleText("red", "%s"),
        values.length === 0
          ? formatObject(formatOrObject)
          : format(formatOrObject, ...values.map((val) => formatObject(val))),
      );
      console.error(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
    },
    info: function (formatOrObject?: object, ...values: object[]) {
      let outputLog = getLogPrefix(logTitle, "Info");
      outputLog += format(
        "%s",
        values.length === 0
          ? formatObject(formatOrObject)
          : format(formatOrObject, ...values.map((val) => formatObject(val))),
      );
      console.info(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
    },
    log: function (formatOrObject?: any, ...values: object[]) {
      let outputLog = getLogPrefix(logTitle, "Info");
      outputLog += format(
        "%s",
        values.length === 0
          ? formatObject(formatOrObject)
          : format(formatOrObject, ...values.map((val) => formatObject(val))),
      );
      console.debug(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
    },
    time: function (label: string) {
      timer.set(label, performance.now());
    },
    timeEnd: function (label: string) {
      const endTime = performance.now();
      const startTime = timer.get(label);
      if (startTime) {
        let outputLog = getLogPrefix(logTitle, "Debug");
        outputLog += format("%s: %dms", label, (endTime - startTime).toFixed(0));
        console.log(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
      }
    },
    warn: function (formatOrObject?: object, ...values: object[]) {
      let outputLog = getLogPrefix(logTitle, "Warning");
      outputLog += format(
        styleText("yellow", "%s"),
        values.length === 0
          ? formatObject(formatOrObject)
          : format(formatOrObject, ...values.map((val) => formatObject(val))),
      );
      console.warn(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
    },
  };
}
