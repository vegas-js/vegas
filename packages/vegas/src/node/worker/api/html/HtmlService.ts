import { CreateHtmlOutput, RequestSync } from "../..";

export class HtmlService implements GoogleAppsScript.HTML.HtmlService {
  #createHtmlOutput: CreateHtmlOutput;
  #requestSync: RequestSync;

  constructor(createHtmlOutput: CreateHtmlOutput, requestSync: RequestSync) {
    this.#createHtmlOutput = createHtmlOutput;
    this.#requestSync = requestSync;
  }

  SandboxMode = { EMULATED: 0, IFRAME: 1, NATIVE: 2 };
  XFrameOptionsMode = { ALLOWALL: 0, DEFAULT: 1 };

  createHtmlOutput = (html?: string | GoogleAppsScript.Base.BlobSource) => {
    if (typeof html !== "string") {
      throw new Error("Method not implemented.");
    }

    return this.#createHtmlOutput(html, this.XFrameOptionsMode.DEFAULT);
  };
  createHtmlOutputFromFile = (filename: string) => {
    const message = this.#requestSync({
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
