// oxlint-disable no-wrapper-object-types
import util from "node:util";

import { GASAPI } from "../GASAPI";

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

function formatGASAPI(object: object & { toString: () => string }) {
  return object.toString();
}

function formatObject(object: unknown): string {
  if (
    object === null ||
    object === undefined ||
    typeof object === "bigint" ||
    typeof object === "boolean" ||
    typeof object === "number" ||
    typeof object === "string" ||
    object instanceof RegExp
  ) {
    return String(object);
  } else if (typeof object === "function") {
    return `[Function${object.name ? `: ${object.name}` : ""}]`;
  } else if (Array.isArray(object)) {
    return `[ ${object.join(", ")} ]`.replace(/^\[  \]$/g, "[]");
  } else if (object instanceof GASAPI) {
    return formatGASAPI(object);
  } else {
    const formattedObject = Object.entries(object).map(([key, value]) => {
      if (typeof value === "function") {
        return `${key}: [Function: ${value.name}]`;
      }
      if (typeof value === "object") {
        if (value instanceof GASAPI) {
          return `${key}: \n${formatGASAPI(value).replace(/^[^{]/g, "  ")}`;
        } else {
          return `${key}: ${formatObject(value)}`;
        }
      }
      const val = typeof value === "string" ? `'${value}'` : String(value);
      return `${key}: ${val}`;
    });
    return `{ ${formattedObject.join(", ")} }`.replace(/^{  }$/g, "{}");
  }
}

function jsonReplacer(this: any, key: string, value: any): any {
  if (value instanceof GASAPI) {
    const obj: Record<string, string> = {};
    Object.entries(value).forEach(([key, value]) => {
      obj[key] = Object.entries(value).find((key, value) => value === 0)![0];
    });
    return obj;
  }
  return value;
}

// https://developers.google.com/apps-script/reference/base/console
export class Console extends GASAPI {
  readonly #logTitle: string;
  readonly #timer: Map<string, number>;

  constructor() {
    super();
    this.#logTitle = "console(GAS)";
    this.#timer = new Map();
  }

  #output(
    output: (message?: any, ...optionalParams: any[]) => void,
    prefix: string,
    ...data: unknown[]
  ) {
    let outputLog = "";
    if (data.length > 0) {
      const formatOrObject = data[0];
      if (typeof formatOrObject !== "string") {
        outputLog = formatObject(formatOrObject);
      } else {
        const values = data.slice(1);
        let isFormat = false;
        let valueIndex = 0;
        for (let i = 0; i < formatOrObject.length; i++) {
          const ch = formatOrObject.charAt(i);
          if (ch === "%") {
            if (!isFormat) {
              isFormat = true;
            } else {
              outputLog += ch;
              isFormat = false;
            }
          } else if (isFormat) {
            if (ch === "s") {
              let value =
                values[valueIndex] instanceof GASAPI
                  ? Object(values[valueIndex]).constructor.name
                  : String(values[valueIndex]);
              if (typeof values[valueIndex] === "function") {
                value = value.replace(/^function\(\) {/, "function () {");
              }
              outputLog += value;
              valueIndex++;
            } else if (ch === "d") {
              outputLog += String(Number(values[valueIndex++]));
            } else if (ch === "j") {
              let value = values[valueIndex++];
              outputLog += JSON.stringify(value, jsonReplacer);
            } else {
              outputLog += `%${ch}`;
            }
            isFormat = false;
          } else {
            outputLog += ch;
          }
        }
        if (valueIndex < values.length) {
          outputLog += ` ${values
            .slice(valueIndex)
            .map((v) => formatObject(v))
            .join(" ")}`;
        }
      }
    }
    output(prefix, outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
  }

  error(): void;
  error(formatOrObject: Object, ...values: Object[]): void;
  error(formatOrObject: any, ...values: any[]): void;
  error(...data: unknown[]): void {
    const logPrefix = getLogPrefix(this.#logTitle, "Error");
    this.#output(console.error, logPrefix, ...data);
  }
  info(): void;
  info(formatOrObject: Object, ...values: Object[]): void;
  info(formatOrObject: any, ...values: any[]): void;
  info(...data: unknown[]): void {
    const logPrefix = getLogPrefix(this.#logTitle, "Info");
    this.#output(console.info, logPrefix, ...data);
  }
  log(): void;
  log(formatOrObject: Object, ...values: Object[]): void;
  log(formatOrObject: any, ...values: any[]): void;
  log(...data: unknown[]): void {
    const logPrefix = getLogPrefix(this.#logTitle, "Info");
    this.#output(console.debug, logPrefix, ...data);
  }
  time(label: string): void {
    this.#timer.set(label, performance.now());
  }
  timeEnd(label: string): void {
    const endTime = performance.now();
    const startTime = this.#timer.get(label);
    if (startTime) {
      this.#timer.delete(label);
      const logPrefix = getLogPrefix(this.#logTitle, "Debug");
      const outputLog = util.format("%s: %dms", label, (endTime - startTime).toFixed(0));
      this.#output(console.log, logPrefix, outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
    } else {
      throw new Error(
        `The parameters (${label}) don't match the method signature for console.timeEnd.`,
      );
    }
  }
  warn(): void;
  warn(formatOrObject: Object, ...values: Object[]): void;
  warn(formatOrObject: any, ...values: any[]): void;
  warn(...data: unknown[]): void {
    const logPrefix = getLogPrefix(this.#logTitle, "Warning");
    this.#output(console.warn, logPrefix, ...data);
  }
}
