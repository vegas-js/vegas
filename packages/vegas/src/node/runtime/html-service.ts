import { MIME_TYPE } from "./base-mime-type";
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
    // Apps Script documents malformed-HTML errors but does not define the validation boundary.
    // Vegas accepts documented valid string input without guessing at Google-internal parsing.
    const html =
      typeof source === "string" ? source : this.#readHtmlBlob(source, "createHtmlOutput");

    return new HtmlOutput(
      html,
      this.#context?.webApp === true,
      this.#htmlTemplateEvaluator,
      this.#blobConverter,
    );
  }

  createHtmlOutputFromFile(filename: string): HtmlOutput {
    // Apps Script also documents malformed-HTML errors for project files without defining the
    // parser contract. Vegas resolves the local project file but does not infer that boundary.
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
    const html = typeof source === "string" ? source : this.#readHtmlBlob(source, "createTemplate");

    return new HtmlTemplate(html, this.#htmlTemplateEvaluator);
  }

  createTemplateFromFile(filename: string): HtmlTemplate {
    return new HtmlTemplate(this.#readHtmlFile(filename), this.#htmlTemplateEvaluator);
  }

  getUserAgent(): string | null {
    const context = this.#context;
    return context?.webApp === true ? context.userAgent : null;
  }

  #readHtmlBlob(
    source: RuntimeBlobSource,
    operation: "createHtmlOutput" | "createTemplate",
  ): string {
    const blob = source.getBlob();

    if (blob.getContentType() !== MIME_TYPE.HTML) {
      // Apps Script documents an Error when the Blob does not contain HTML but does not define
      // content sniffing. Vegas accepts the documented HTML MIME type and fails closed otherwise.
      throw new Error(`HtmlService.${operation}() requires a Blob containing HTML.`);
    }

    return blob.getDataAsString();
  }

  #readHtmlFile(filename: string): string {
    // Apps Script addresses editor HTML files by logical name. Vegas resolves local project HTML
    // by physical `.html` path and accepts either spelling at this local filesystem boundary.
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
