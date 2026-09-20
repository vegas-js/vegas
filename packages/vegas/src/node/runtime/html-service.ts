import type { RuntimeBlobSource } from "./blob";
import { HTML_SANDBOX_MODE, HTML_X_FRAME_OPTIONS_MODE } from "./html-enum";
import { HtmlOutput } from "./html-output";
import type { InvocationContext } from "./invocation";

// https://developers.google.com/apps-script/reference/html/html-service
export class HtmlService {
  readonly #context: InvocationContext | undefined;
  readonly #htmlFiles: Readonly<Record<string, string>>;

  readonly SandboxMode = HTML_SANDBOX_MODE;
  readonly XFrameOptionsMode = HTML_X_FRAME_OPTIONS_MODE;

  constructor(htmlFiles: Readonly<Record<string, string>> = {}, context?: InvocationContext) {
    this.#context = context;
    this.#htmlFiles = htmlFiles;
  }

  createHtmlOutput(): HtmlOutput;
  createHtmlOutput(blob: RuntimeBlobSource): HtmlOutput;
  createHtmlOutput(html: string): HtmlOutput;
  createHtmlOutput(source: string | RuntimeBlobSource = ""): HtmlOutput {
    const html = typeof source === "string" ? source : source.getBlob().getDataAsString();

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

  getUserAgent(): string | null {
    const context = this.#context;
    return context?.webApp === true ? context.userAgent : null;
  }
}

export function createHtmlService(
  htmlFiles: Readonly<Record<string, string>> = {},
  context?: InvocationContext,
): HtmlService {
  return new HtmlService(htmlFiles, context);
}
