// oxlint-disable no-wrapper-object-types
import { GASAPI } from "../GASAPI";
import { getLogPrefix } from "./console";

function convertNumberOutput(num: unknown): string {
  if (num === null || num === undefined) {
    return "0.0";
  } else if (typeof num !== "number" || Number.isNaN(num)) {
    return String(NaN);
  } else if (!Number.isFinite(num)) {
    return String(Infinity);
  } else if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
    return num.toExponential().replace("e+", "E");
  } else {
    const min = Math.floor(num);
    const max = Math.ceil(num);
    return isNaN(num) || (num > min && num < max) ? num.toString() : `${num.toString()}.0`;
  }
}

// https://developers.google.com/apps-script/reference/base/logger
export class Logger extends GASAPI implements GoogleAppsScript.Base.Logger {
  readonly #logTitle: string;
  readonly #formatter: Intl.DateTimeFormat;
  outputLogs: { prefix: string; value: string }[];

  constructor() {
    super();
    this.#logTitle = "Logger (GAS)";
    this.#formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
      timeZoneName: "longGeneric",
    });
    this.outputLogs = [];
  }

  #convertObjectOutput(data: unknown, recursive: boolean = false): string {
    if (data === null || data === undefined) {
      return String(null);
    } else if (typeof data === "boolean") {
      return String(data);
    } else if (typeof data === "number") {
      return convertNumberOutput(data);
    } else if (typeof data === "string") {
      return data;
    } else if (data instanceof RegExp) {
      return "{}";
    } else if (typeof data === "function") {
      return String(data).replace(/^function\(\) {/, "function () {");
    } else if (typeof data === "symbol") {
      return String();
    } else if (Array.isArray(data)) {
      return `[${data.map((v) => this.#convertObjectOutput(v)).join(", ")}]`.replace(
        /^\[  \]$/g,
        "[]",
      );
    } else {
      if (!recursive && (data as any).message !== undefined) {
        return (data as any).message;
      } else if (data instanceof GASAPI) {
        return data.constructor.name;
      } else {
        const outObjects = Object.entries(data)
          .map(([key, value]) => {
            if (value instanceof GASAPI) {
              return `${key}=${value.constructor.name}`;
            } else {
              return `${key}=${this.#convertObjectOutput(value, true).replace(/^\s+/gm, "").replace(/\n/g, "")}`;
            }
          })
          .join(", ");

        return `{${outObjects}}`;
      }
    }
  }

  clear(): void {
    this.outputLogs.splice(0);
  }
  getLog(): string {
    return this.outputLogs.map((log) => `${log.prefix}: ${log.value}`).join("\n");
  }
  log(data: Object): Logger;
  log(data: any): Logger;
  log(format: string, ...values: Object[]): Logger;
  log(format: any, ...values: any[]): Logger;
  log(dataOrFormat: unknown, ...values: unknown[]): Logger {
    const date = new Date();
    const logLevel = "Info";
    const logPrefix = getLogPrefix(this.#logTitle, logLevel, date);
    let outputLog = "";
    if (typeof dataOrFormat !== "string") {
      outputLog += this.#convertObjectOutput(dataOrFormat);
    } else {
      let isFormat = false;
      let valueIndex = 0;
      for (let i = 0; i < dataOrFormat.length; i++) {
        const ch = dataOrFormat.charAt(i);
        if (ch === "%") {
          if (!isFormat) {
            isFormat = true;
          } else {
            outputLog += ch;
            isFormat = false;
          }
        } else if (isFormat) {
          if (ch === "s" || ch === "j") {
            outputLog += this.#convertObjectOutput(values[valueIndex++], true);
          } else if (ch === "d") {
            outputLog += convertNumberOutput(values[valueIndex++]);
          } else {
            outputLog += `%${ch}`;
          }
          isFormat = false;
        } else {
          outputLog += ch;
        }
      }
    }
    const parts: Record<string, string> = {};
    this.#formatter.formatToParts(date.valueOf()).forEach((part) => {
      if (part.type !== "literal") {
        parts[part.type] = part.value;
      }
    });
    const prefix = [
      parts.weekday,
      parts.month,
      parts.day,
      `${parts.hour}:${parts.minute}:${parts.second}`,
      parts.timeZoneName.replace(/[a-z ]/g, ""),
      parts.year,
      logLevel.toUpperCase(),
    ].join(" ");
    this.outputLogs.push({ prefix, value: outputLog });
    console.log(logPrefix, outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));

    return this;
  }
}
