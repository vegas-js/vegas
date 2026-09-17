import { HtmlOutput, type HtmlSandboxMode, type HtmlXFrameOptionsMode } from "./html-output";

const SANDBOX_MODE = {
  EMULATED: "EMULATED",
  IFRAME: "IFRAME",
  NATIVE: "NATIVE",
} as const satisfies Readonly<Record<HtmlSandboxMode, HtmlSandboxMode>>;

const X_FRAME_OPTIONS_MODE = {
  ALLOWALL: "ALLOWALL",
  DEFAULT: "DEFAULT",
} as const satisfies Readonly<Record<HtmlXFrameOptionsMode, HtmlXFrameOptionsMode>>;

// https://developers.google.com/apps-script/reference/html/html-service
export class HtmlService {
  readonly #htmlFiles: Readonly<Record<string, string>>;

  readonly SandboxMode = SANDBOX_MODE;
  readonly XFrameOptionsMode = X_FRAME_OPTIONS_MODE;

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
