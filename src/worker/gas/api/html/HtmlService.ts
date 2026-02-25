import { RequestSyncFn } from "../..";
import { HtmlOutput } from "./HtmlOutput";

export function HtmlService(requestSync: RequestSyncFn): GoogleAppsScript.HTML.HtmlService {
  return {
    SandboxMode: { EMULATED: 0, IFRAME: 1, NATIVE: 2 },
    XFrameOptionsMode: { ALLOWALL: 0, DEFAULT: 1 },
    createHtmlOutput: function (
      html?: string | GoogleAppsScript.Base.BlobSource,
    ): GoogleAppsScript.HTML.HtmlOutput {
      if (typeof html !== "string") {
        throw new Error("Method not implemented.");
      }
      const output = HtmlOutput();
      return output.setContent(html);
    },
    createHtmlOutputFromFile: function (filename: string): GoogleAppsScript.HTML.HtmlOutput {
      const message = requestSync("vegas:HtmlService#createHtmlOutputFromFile", filename);
      if (!message) {
        throw new Error(`No HTML file named ${filename} was found.`);
      }

      return this.createHtmlOutput(message);
    },
    createTemplate: function (
      _html: string | GoogleAppsScript.Base.BlobSource,
    ): GoogleAppsScript.HTML.HtmlTemplate {
      throw new Error("Function not implemented.");
    },
    createTemplateFromFile: function (_filename: string): GoogleAppsScript.HTML.HtmlTemplate {
      throw new Error("Function not implemented.");
    },
    getUserAgent: function (): string {
      throw new Error("Function not implemented.");
    },
  };
}
