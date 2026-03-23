// oxlint-disable no-wrapper-object-types
import util from "node:util";

import { getLogPrefix } from "./console";

function convertNumberOutput(num: number): string {
  const min = Math.floor(num);
  const max = Math.ceil(num);
  return num > min && num < max ? num.toString() : `${num.toString()}.0`;
}

// https://developers.google.com/apps-script/reference/base/logger
export class Logger implements GoogleAppsScript.Base.Logger {
  readonly #logTitle: string;
  outputLogs: string[];

  constructor() {
    this.#logTitle = "Logger (GAS)";
    this.outputLogs = [];
  }

  toString() {
    return this.constructor.name;
  }

  clear() {
    this.outputLogs = [];
  }
  getLog() {
    return this.outputLogs.join("\n");
  }
  log(data: Object): Logger;
  log(data: any): Logger;
  log(format: string, ...values: Object[]): Logger;
  log(dataOrFormat: Object, ...values: Object[]): Logger {
    let outputLog = getLogPrefix(this.#logTitle, "Info");
    if (values.length === 0) {
      if (dataOrFormat === null || dataOrFormat === undefined) {
        outputLog += null;
      } else {
        switch (typeof dataOrFormat) {
          case "number": {
            outputLog += convertNumberOutput(dataOrFormat);
            break;
          }
          case "string": {
            outputLog += dataOrFormat;
            break;
          }
          case "object": {
            if ((dataOrFormat as any).message !== undefined) {
              outputLog += (dataOrFormat as any).message;
            } else {
              if (dataOrFormat.constructor.name === "Object") {
                const outObjects = Object.entries(dataOrFormat)
                  .map(([key, value]) => {
                    const strValue = `${value}`;
                    return `${key}=${strValue.replace(/^\s+/gm, "").replace(/\n/g, "")}`;
                  })
                  .join(", ");

                outputLog += `{${outObjects}}`;
              } else {
                // oxlint-disable-next-line no-base-to-string
                const strObject = dataOrFormat.toString();
                outputLog +=
                  strObject === "[object Object]" ? JSON.stringify(dataOrFormat) : strObject;
              }
            }
            break;
          }
          default: {
            outputLog += dataOrFormat;
          }
        }
      }
    } else {
      // TODO
      const outValues = [];
      for (const value of values) {
        if (!value) {
          continue;
        }
        switch (typeof value) {
          case "number": {
            outValues.push(convertNumberOutput(value));
            break;
          }
          case "object": {
            outValues.push(
              `{${Object.entries(value)
                .map(([key, value]) => `${key}=${value}`)
                .join(", ")}}`,
            );
            break;
          }
          default: {
            outValues.push(value);
          }
        }
      }
      outputLog += util.format((dataOrFormat as string).replace(/[^%]?%d/, "%s"), ...outValues);
      this.outputLogs.push(
        util.format((dataOrFormat as string).replace(/[^%]?%d/, "%s"), ...outValues),
      );
    }
    console.log(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
    return this;
  }
}
