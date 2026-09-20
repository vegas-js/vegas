import type { RuntimeBlobSource } from "./blob";
import type { BlobConverter } from "./blob-converter";
import { HTML_SANDBOX_MODE, HTML_X_FRAME_OPTIONS_MODE } from "./html-enum";
import { HtmlOutput } from "./html-output";
import { HtmlTemplate, type HtmlTemplateEvaluator } from "./html-template";
import type { InvocationContext } from "./invocation";

// https://developers.google.com/apps-script/reference/html/html-service
export class HtmlService {
  readonly #blobConverter: BlobConverter | undefined;
  readonly #context: InvocationContext | undefined;
  readonly #htmlFiles: Readonly<Record<string, string>>;
  readonly #htmlTemplateEvaluator: HtmlTemplateEvaluator | undefined;

  readonly SandboxMode = HTML_SANDBOX_MODE;
  readonly XFrameOptionsMode = HTML_X_FRAME_OPTIONS_MODE;

  constructor(
    htmlFiles: Readonly<Record<string, string>> = {},
    context?: InvocationContext,
    htmlTemplateEvaluator?: HtmlTemplateEvaluator,
    blobConverter?: BlobConverter,
  ) {
    this.#blobConverter = blobConverter;
    this.#context = context;
    this.#htmlFiles = htmlFiles;
    this.#htmlTemplateEvaluator = htmlTemplateEvaluator;
  }

  createHtmlOutput(): HtmlOutput;
  createHtmlOutput(blob: RuntimeBlobSource): HtmlOutput;
  createHtmlOutput(html: string): HtmlOutput;
  createHtmlOutput(source: string | RuntimeBlobSource = ""): HtmlOutput {
    const html = typeof source === "string" ? source : source.getBlob().getDataAsString();

    return new HtmlOutput(
      html,
      this.#context?.webApp === true,
      this.#htmlTemplateEvaluator,
      this.#blobConverter,
    );
  }

  createHtmlOutputFromFile(filename: string): HtmlOutput {
    return new HtmlOutput(
      this.#readHtmlFile(filename),
      this.#context?.webApp === true,
      this.#htmlTemplateEvaluator,
      this.#blobConverter,
    );
  }

  createTemplate(blob: RuntimeBlobSource): HtmlTemplate;
  createTemplate(html: string): HtmlTemplate;
  createTemplate(source: string | RuntimeBlobSource): HtmlTemplate {
    const html = typeof source === "string" ? source : source.getBlob().getDataAsString();

    return new HtmlTemplate(html, this.#htmlTemplateEvaluator);
  }

  createTemplateFromFile(filename: string): HtmlTemplate {
    return new HtmlTemplate(this.#readHtmlFile(filename), this.#htmlTemplateEvaluator);
  }

  getUserAgent(): string | null {
    const context = this.#context;
    return context?.webApp === true ? context.userAgent : null;
  }

  #readHtmlFile(filename: string): string {
    const path = filename.endsWith(".html") ? filename : `${filename}.html`;
    const html = this.#htmlFiles[path];

    if (html === undefined) {
      throw new Error(`HTML file not found: ${filename}`);
    }

    return html;
  }
}

export function createHtmlService(
  htmlFiles: Readonly<Record<string, string>> = {},
  context?: InvocationContext,
  htmlTemplateEvaluator?: HtmlTemplateEvaluator,
  blobConverter?: BlobConverter,
): HtmlService {
  return new HtmlService(htmlFiles, context, htmlTemplateEvaluator, blobConverter);
}
