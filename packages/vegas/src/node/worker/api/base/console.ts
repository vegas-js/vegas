// oxlint-disable no-wrapper-object-types
// oxlint-disable no-base-to-string
import util from "node:util";

const logPrefixFormat = `${util.styleText(["black", "bgGreenBright"], "%s")}  %s%s`;

function getTimestamp(date: Date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return [hours, minutes, seconds].join(":").padEnd(10);
}

export function getLogPrefix(title: string, level: string, date: Date = new Date()) {
  const paddedTitle = title.padStart(title.length + 1).padEnd(title.length + 2);

  const paddedTimestamp =
    level === "Warning"
      ? util.styleText("yellow", getTimestamp(date).padEnd(10))
      : level === "Error"
        ? util.styleText("red", getTimestamp(date).padEnd(10))
        : getTimestamp(date).padEnd(10);
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
    output = `[Function${object.name ? `: ${object.name}` : ""}]`;
  } else if (typeof object === "symbol") {
    output = "{}";
  } else if (typeof object === "object") {
    if (Array.isArray(object)) {
      output = object;
    } else {
      function getProps(
        obj: object | null,
        props: Set<string> = new Set(),
        filter?: (arg: [string, PropertyDescriptor]) => boolean,
      ): string[] {
        if (!obj || obj === Object.prototype) {
          return Array.from(props).reverse();
        }
        Object.entries(Object.getOwnPropertyDescriptors(obj))
          .reverse()
          .forEach(([key, desc]) => {
            if (key !== "constructor" && (filter?.([key, desc]) ?? true)) {
              props.add(key);
            }
          });
        return getProps(Object.getPrototypeOf(obj), props, filter);
      }

      output =
        (object as any).toString() ??
        getProps(object)
          .join(", ")
          .replace(/\[Function:[^\]]*\]/g, "[Function]")
          .replace(/^\{[^\w]*/, "{ ")
          .replace(/\n\}$/, " }");
    }
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

  toString(): string {
    return this.constructor.name.toLowerCase();
  }

  error(): void;
  error(formatOrObject: Object, ...values: Object[]): void;
  error(formatOrObject: any, ...values: any[]): void;
  error(formatOrObject?: Object, ...values: Object[]): void {
    const logPrefix = getLogPrefix(this.#logTitle, "Error");
    let outputLog = "";
    outputLog += util.format(
      util.styleText("red", "%s"),
      values.length === 0
        ? formatObject(formatOrObject)
        : util.format(formatOrObject, ...values.map((val) => formatObject(val))),
    );
    console.error(logPrefix, outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
  }
  info(): void;
  info(formatOrObject: Object, ...values: Object[]): void;
  info(formatOrObject: any, ...values: any[]): void;
  info(formatOrObject?: Object, ...values: Object[]): void {
    const logPrefix = getLogPrefix(this.#logTitle, "Info");
    let outputLog = "";
    outputLog += util.format(
      "%s",
      values.length === 0
        ? formatObject(formatOrObject)
        : util.format(formatOrObject, ...values.map((val) => formatObject(val))),
    );
    console.info(logPrefix, outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
  }
  log(): void;
  log(formatOrObject: Object, ...values: Object[]): void;
  log(formatOrObject: any, ...values: any[]): void;
  log(formatOrObject?: Object, ...values: Object[]): void {
    const logPrefix = getLogPrefix(this.#logTitle, "Info");
    let outputLog = "";
    if (typeof formatOrObject !== "string" || values.length === 0) {
      const isClass =
        formatOrObject &&
        formatOrObject.constructor &&
        formatOrObject.constructor.name !== "Object";
      if (formatOrObject) {
        outputLog += isClass
          ? formatObject(formatOrObject)
          : `{ ${Object.entries(formatOrObject)
              .map(([key, value]) => {
                const val =
                  typeof value === "function" ? `[Function: ${value.name}]` : `'${value}'`;
                return `${key}: ${val}`;
              })
              .join(",\n")} }`;
        outputLog = outputLog.replace(/^{  }$/g, "{}");
      } else {
        outputLog += formatOrObject;
      }
    } else {
      outputLog = formatOrObject;
      const matched = outputLog.match(/%[sdj%]/g);
      if (matched) {
        let maxIndex = 0;
        let maxOffset = 0;
        matched.forEach((match, index) => {
          if (match === "%s") {
            const value = values[index];
            if (typeof value === "object" || typeof value === "symbol") {
              outputLog = outputLog.replace(match, value.toString());
            } else {
              outputLog = outputLog.replace(match, value);
            }
          } else if (match === "%d") {
            const value = formatObject(Number(values[index]) as any);
            outputLog = outputLog.replace(match, `${value}`);
          } else if (match === "%j") {
            const value = JSON.stringify(values[index]);
            outputLog = outputLog.replace(match, value);
          } else {
            outputLog = outputLog.replace(match, "%");
            maxOffset++;
          }
          maxIndex = index;
        });
        console.log(maxIndex, values);
        if (maxIndex - maxOffset < values.length - 1) {
          outputLog += ` ${values.slice(maxIndex - maxOffset).join(" ")}`;
        }
      } else {
        outputLog += ` ${values.join(" ")}`;
      }
    }
    console.debug(logPrefix, outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
  }
  time(label: string): void {
    this.#timer.set(label, performance.now());
  }
  timeEnd(label: string): void {
    const endTime = performance.now();
    const startTime = this.#timer.get(label);
    if (startTime) {
      const logPrefix = getLogPrefix(this.#logTitle, "Debug");
      let outputLog = "";
      outputLog += util.format("%s: %dms", label, (endTime - startTime).toFixed(0));
      console.log(logPrefix, outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
    }
  }
  warn(): void;
  warn(formatOrObject: Object, ...values: Object[]): void;
  warn(formatOrObject: any, ...values: any[]): void;
  warn(formatOrObject?: Object, ...values: Object[]): void {
    const logPrefix = getLogPrefix(this.#logTitle, "Warning");
    let outputLog = "";
    outputLog += util.format(
      util.styleText("yellow", "%s"),
      values.length === 0
        ? formatObject(formatOrObject)
        : util.format(formatOrObject, ...values.map((val) => formatObject(val))),
    );
    console.warn(logPrefix, outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
  }
}
