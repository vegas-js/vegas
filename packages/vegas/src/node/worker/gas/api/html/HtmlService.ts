import { requestSync } from "../..";
import { HtmlOutput } from "./HtmlOutput";

export class HtmlService implements GoogleAppsScript.HTML.HtmlService {
  SandboxMode = { EMULATED: 0, IFRAME: 1, NATIVE: 2 };
  XFrameOptionsMode = { ALLOWALL: 0, DEFAULT: 1 };

  createHtmlOutput = (html?: string | GoogleAppsScript.Base.BlobSource) => {
    if (typeof html !== "string") {
      throw new Error("Method not implemented.");
    }

    return new HtmlOutput(html, this.XFrameOptionsMode.DEFAULT);
  };
  createHtmlOutputFromFile = (filename: string) => {
    const message = requestSync({
      message: "HtmlService#createHtmlOutputFromFile",
      payload: filename,
    });
    if (!message) {
      throw new Error(`No HTML file named ${filename} was found.`);
    }

    return this.createHtmlOutput(message);
  };
  createTemplate = (html: string | GoogleAppsScript.Base.BlobSource) => {
    throw new Error("Function not implemented.");
  };
  createTemplateFromFile = (filename: string) => {
    throw new Error("Function not implemented.");
  };
  getUserAgent = () => {
    throw new Error("Function not implemented.");
  };
}
