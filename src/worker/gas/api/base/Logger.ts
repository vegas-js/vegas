import { format } from "node:util";

import { getLogPrefix } from "./console";

function convertNumberOutput(num: number): string {
  const min = Math.floor(num);
  const max = Math.ceil(num);
  return num > min && num < max ? num.toString() : `${num.toString()}.0`;
}

// https://developers.google.com/apps-script/reference/base/logger
export function Logger(): GoogleAppsScript.Base.Logger {
  const logTitle = "Logger (GAS)";
  let _outputLogs: string[] = [];

  function output(dataOrFormat: string, values: unknown[]) {
    let outputLog = getLogPrefix(logTitle, "Info");
    if (values.length === 0) {
      const data =
        typeof dataOrFormat === "number" ? convertNumberOutput(dataOrFormat) : dataOrFormat;
      outputLog += data;
      _outputLogs.push(data);
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

      outputLog += format(dataOrFormat.replace(/[^%]?%d/, "%s"), ...outValues);
      _outputLogs.push(format(dataOrFormat.replace(/[^%]?%d/, "%s"), ...outValues));
    }
    console.log(outputLog.replace(/\n/g, `\n${"".padEnd(36)}`));
  }

  return {
    clear: function () {
      _outputLogs = [];
    },
    getLog: function () {
      return _outputLogs.join("\n");
    },
    log: function (format: string, ...values: unknown[]) {
      output(format, values);
      return this;
    },
  };
}
