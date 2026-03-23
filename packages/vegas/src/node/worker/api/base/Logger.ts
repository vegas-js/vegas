// oxlint-disable no-wrapper-object-types
import { getLogPrefix } from "./console";

function convertNumberOutput(num: number): string {
  const min = Math.floor(num);
  const max = Math.ceil(num);
  return isNaN(num) || (num > min && num < max) ? num.toString() : `${num.toString()}.0`;
}

// https://developers.google.com/apps-script/reference/base/logger
export class Logger implements GoogleAppsScript.Base.Logger {
  readonly #logTitle: string;
  readonly #formatter: Intl.DateTimeFormat;
  outputLogs: { prefix: string; value: string }[];

  constructor() {
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

  #convertObjectOutput(data: Object): string {
    switch (typeof data) {
      case "undefined": {
        return "null";
      }
      case "number": {
        return convertNumberOutput(data);
      }
      case "string": {
        return data;
      }
      case "object": {
        if (data === null) {
          return "null";
        } else if ((data as any).message !== undefined) {
          return (data as any).message;
        } else if (data.constructor.name === "Object") {
          const outObjects = Object.entries(data)
            .map(([key, value]) => {
              const strValue = typeof value === "number" ? convertNumberOutput(value) : `${value}`;
              return `${key}=${strValue.replace(/^\s+/gm, "").replace(/\n/g, "")}`;
            })
            .join(", ");

          return `{${outObjects}}`;
        } else {
          // oxlint-disable-next-line no-base-to-string
          const strObject = data.toString();
          return strObject === "[object Object]" ? JSON.stringify(data) : strObject;
        }
      }
      case "symbol": {
        return "";
      }
      default: {
        return String(data);
      }
    }
  }

  toString(): string {
    return this.constructor.name;
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
  log(format: string, ...values: any[]): Logger;
  log(dataOrFormat: Object, ...values: Object[]): Logger {
    const date = new Date();
    const logLevel = "Info";
    const logPrefix = getLogPrefix(this.#logTitle, logLevel, date);
    let outputLog = "";
    if (typeof dataOrFormat !== "string" || values.length === 0) {
      outputLog += this.#convertObjectOutput(dataOrFormat);
    } else {
      outputLog = dataOrFormat;
      const matched = outputLog.match(/%[sdj%]/g);
      if (matched) {
        matched.forEach((match, index) => {
          if (match === "%s") {
            const value = this.#convertObjectOutput(values[index]);
            outputLog = outputLog.replace(match, value);
          } else if (match === "%d") {
            const value = convertNumberOutput(Number(values[index]));
            outputLog = outputLog.replace(match, `${value}`);
          } else if (match === "%j") {
            const value = this.#convertObjectOutput(values[index]);
            outputLog = outputLog.replace(match, value);
          } else {
            outputLog = outputLog.replace(match, "%");
          }
        });
      }
    }
    const parts: Record<string, string> = {};
    this.#formatter.formatToParts(date.valueOf()).forEach((part) => {
      if (part.type !== "literal") {
        parts[part.type] = part.value;
      }
    });
    const prefix = [
      parts.month,
      parts.weekday,
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
