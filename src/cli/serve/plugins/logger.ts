import { styleText } from "node:util";

function convertNumberOutput(num: number): string {
  const min = Math.floor(num);
  const max = Math.ceil(num);
  return num > min && num < max ? num.toString() : `${num.toString()}.0`;
}

// https://developers.google.com/apps-script/reference/base/logger
export class GASLogger implements GoogleAppsScript.Base.Logger {
  readonly #logFormat = `${styleText(["black", "bgGreenBright"], " Logger (GAS) ")}  %s%s`;
  output(dataOrFormat: string, values: unknown[]): void {
    const date = new Date();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const timestamp = [hours, minutes, seconds].join(":").padEnd(10);
    const paddedTimestamp = timestamp.padEnd(10);
    const paddedLevel = "Info".padEnd(10);
    if (values.length > 0) {
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

      console.log(
        `${this.#logFormat}${dataOrFormat.replace(/[^%]?%d/, "%s")}`,
        paddedTimestamp,
        paddedLevel,
        ...outValues,
      );
    } else {
      const data =
        typeof dataOrFormat === "number" ? convertNumberOutput(dataOrFormat) : dataOrFormat;
      console.log(`${this.#logFormat}${data}`, paddedTimestamp, paddedLevel);
    }
  }

  clear(): void {
    throw new Error("Method not implemented.");
  }
  getLog(): string {
    throw new Error("Method not implemented.");
  }
  log(data: unknown): GoogleAppsScript.Base.Logger;
  log(format: string, ...values: unknown[]): GoogleAppsScript.Base.Logger {
    this.output(format, values);
    return this;
  }
}
