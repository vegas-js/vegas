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
    this.#logTitle = "Logger(GAS)";
    this.outputLogs = [];
  }

  clear = () => {
    this.outputLogs = [];
  };
  getLog = () => {
    return this.outputLogs.join("\n");
  };
  log = (format: string, ...values: unknown[]) => {
    let outputLog = getLogPrefix(this.#logTitle, "Info");
    if (values.length === 0) {
      const data = typeof format === "number" ? convertNumberOutput(format) : format;
      outputLog += data;
      this.outputLogs.push(data);
    } else {
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

      outputLog += util.format(format.replace(/[^%]?%d/, "%s"), ...outValues);
      this.outputLogs.push(util.format(format.replace(/[^%]?%d/, "%s"), ...outValues));
    }
    console.log(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
    return this;
  };
}
