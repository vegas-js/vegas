import { CreateHtmlOutput, RequestSync } from "../..";
import { GASAPI } from "../GASAPI";

// https://developers.google.com/apps-script/reference/html/html-service
export class HtmlService extends GASAPI implements GoogleAppsScript.HTML.HtmlService {
  #createHtmlOutput: CreateHtmlOutput;
  #requestSync: RequestSync;

  constructor(createHtmlOutput: CreateHtmlOutput, requestSync: RequestSync) {
    super();
    this.#createHtmlOutput = createHtmlOutput;
    this.#requestSync = requestSync;
  }

  SandboxMode = { EMULATED: 0, IFRAME: 1, NATIVE: 2 };
  XFrameOptionsMode = { DEFAULT: 0, ALLOWALL: 1 };

  createHtmlOutput(): GoogleAppsScript.HTML.HtmlOutput;
  createHtmlOutput(html: string): GoogleAppsScript.HTML.HtmlOutput;
  createHtmlOutput(blob: GoogleAppsScript.Base.BlobSource): GoogleAppsScript.HTML.HtmlOutput;
  createHtmlOutput(htmlOrBlob?: unknown): GoogleAppsScript.HTML.HtmlOutput {
    if (typeof htmlOrBlob !== "string") {
      throw new Error("Method not implemented.");
    }

    return this.#createHtmlOutput(htmlOrBlob ?? "", this.XFrameOptionsMode.DEFAULT);
  }
  createHtmlOutputFromFile(filename: string): GoogleAppsScript.HTML.HtmlOutput {
    const message = this.#requestSync({
      message: `${this.constructor.name}#createHtmlOutputFromFile`,
      payload: filename,
    });
    if (!message) {
      throw new Error(`No HTML file named ${filename} was found.`);
    }

    return this.createHtmlOutput(message);
  }
  createTemplate(html: string): GoogleAppsScript.HTML.HtmlTemplate;
  createTemplate(blob: GoogleAppsScript.Base.BlobSource): GoogleAppsScript.HTML.HtmlTemplate;
  createTemplate(htmlOrBlob: unknown): GoogleAppsScript.HTML.HtmlTemplate {
    throw new Error("Function not implemented.");
  }
  createTemplateFromFile(filename: string): GoogleAppsScript.HTML.HtmlTemplate {
    throw new Error("Function not implemented.");
  }
  getUserAgent(): string {
    throw new Error("Function not implemented.");
  }
}
