import { parse } from "node:path";

import { GASHtmlOutput } from "./htmloutput";

// https://developers.google.com/apps-script/reference/html/html-service
export class GASHtmlService implements GoogleAppsScript.HTML.HtmlService {
  readonly #webCodeMap: Map<string, string>;

  constructor(webCodeMap: Map<string, string>) {
    this.#webCodeMap = webCodeMap;
  }

  SandboxMode = {
    EMULATED: 0,
    IFRAME: 1,
    NATIVE: 2,
  };
  XFrameOptionsMode = {
    ALLOWALL: 0,
    DEFAULT: 1,
  };

  createHtmlOutput(html?: unknown): GoogleAppsScript.HTML.HtmlOutput {
    if (typeof html !== "string") {
      throw new Error("Method not implemented.");
    }
    const output = new GASHtmlOutput();
    return output.setContent(html);
  }
  createHtmlOutputFromFile(filename: string): GoogleAppsScript.HTML.HtmlOutput {
    const filePath = `${parse(filename).name}.html`;
    const html = this.#webCodeMap.get(filePath);
    if (!html) {
      throw new Error(`No HTML file named ${filename} was found.`);
    }

    return this.createHtmlOutput(html);
  }
  createTemplate(_html: unknown): GoogleAppsScript.HTML.HtmlTemplate {
    throw new Error("Method not implemented.");
  }
  createTemplateFromFile(_filename: string): GoogleAppsScript.HTML.HtmlTemplate {
    throw new Error("Method not implemented.");
  }
  getUserAgent(): string {
    throw new Error("Method not implemented.");
  }
}
