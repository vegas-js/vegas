import { HTML_SANDBOX_MODE, HTML_X_FRAME_OPTIONS_MODE } from "./html-enum";
import { HtmlOutput } from "./html-output";

// https://developers.google.com/apps-script/reference/html/html-service
export class HtmlService {
  readonly #htmlFiles: Readonly<Record<string, string>>;

  readonly SandboxMode = HTML_SANDBOX_MODE;
  readonly XFrameOptionsMode = HTML_X_FRAME_OPTIONS_MODE;

  constructor(htmlFiles: Readonly<Record<string, string>> = {}) {
    this.#htmlFiles = htmlFiles;
  }

  createHtmlOutput(): HtmlOutput;
  createHtmlOutput(html: string): HtmlOutput;
  createHtmlOutput(html = ""): HtmlOutput {
    return new HtmlOutput(html);
  }

  createHtmlOutputFromFile(filename: string): HtmlOutput {
    const path = filename.endsWith(".html") ? filename : `${filename}.html`;
    const html = this.#htmlFiles[path];

    if (html === undefined) {
      throw new Error(`HTML file not found: ${filename}`);
    }

    return new HtmlOutput(html);
  }
}

export function createHtmlService(htmlFiles: Readonly<Record<string, string>> = {}): HtmlService {
  return new HtmlService(htmlFiles);
}
