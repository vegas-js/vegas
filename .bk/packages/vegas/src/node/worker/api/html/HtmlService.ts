import { CreateHtmlOutput, CreateHtmlTemplate, RequestSync } from "../..";
import { GASAPI } from "../GASAPI";

// https://developers.google.com/apps-script/reference/html/html-service
export class HtmlService extends GASAPI implements GoogleAppsScript.HTML.HtmlService {
  #createHtmlOutput: CreateHtmlOutput;
  #createHtmlTemplate: CreateHtmlTemplate;
  #requestSync: RequestSync;

  constructor(
    createHtmlOutput: CreateHtmlOutput,
    createHtmlTemplate: CreateHtmlTemplate,
    requestSync: RequestSync,
  ) {
    super();
    this.#createHtmlOutput = createHtmlOutput;
    this.#createHtmlTemplate = createHtmlTemplate;
    this.#requestSync = requestSync;
  }

  initTemplateExp() {
    let content: string = "";
    return {
      set _(value: string) {
        content += value;
      },
      set _$(value: string) {
        content += value.replace(/</g, "&lt").replace(/>/g, "&gt");
      },
      flush() {
        this.$out.setContent(content);
      },
      $out: this.#createHtmlOutput("", this.XFrameOptionsMode.DEFAULT),
    };
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
    if (typeof htmlOrBlob !== "string") {
      throw new Error("Method not implemented.");
    }

    return this.#createHtmlTemplate(htmlOrBlob ?? "");
  }
  createTemplateFromFile(filename: string): GoogleAppsScript.HTML.HtmlTemplate {
    const message = this.#requestSync({
      message: `${this.constructor.name}#createTemplateFromFile`,
      payload: filename,
    });
    if (!message) {
      throw new Error(`No HTML file named ${filename} was found.`);
    }

    return this.#createHtmlTemplate(message);
  }
  getUserAgent(): string {
    throw new Error("Function not implemented.");
  }
}
