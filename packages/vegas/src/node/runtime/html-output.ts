import { createBlob, type RuntimeBlob } from "./blob";
import { convertBlob, type BlobConverter } from "./blob-converter";
import { escapeHtmlContextually } from "./html-contextual-escape";
import type { HtmlSandboxMode, HtmlXFrameOptionsMode } from "./html-enum";
import { HtmlTemplate, type HtmlTemplateEvaluator } from "./html-template";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

export interface HtmlOutputSnapshot {
  readonly content: string;
  readonly faviconUrl: string;
  readonly metaTags: readonly {
    readonly name: string;
    readonly content: string;
  }[];
  readonly title: string;
  readonly xFrameOptionsMode: HtmlXFrameOptionsMode;
}

const ALLOWED_HTML_META_TAG_NAMES = new Set([
  "apple-mobile-web-app-capable",
  "google-site-verification",
  "mobile-web-app-capable",
  "viewport",
]);
const SERIALIZE_HTML_OUTPUT = Symbol("serializeHtmlOutput");

// https://developers.google.com/apps-script/reference/html/html-output-meta-tag
export class HtmlOutputMetaTag {
  readonly #content: string;
  readonly #name: string;

  constructor(name: string, content: string) {
    this.#name = name;
    this.#content = content;
  }

  getContent(): string {
    return this.#content;
  }

  getName(): string {
    return this.#name;
  }
}

// https://developers.google.com/apps-script/reference/html/html-output
export class HtmlOutput {
  readonly #blobConverter: BlobConverter | undefined;
  #content: string;
  #faviconUrl = "";
  #height: number | null = null;
  readonly #htmlTemplateEvaluator: HtmlTemplateEvaluator | undefined;
  readonly #metaTags: HtmlOutputMetaTag[] = [];
  #title = "";
  readonly #webApp: boolean;
  #width: number | null = null;
  #xFrameOptionsMode: HtmlXFrameOptionsMode = "DEFAULT";

  constructor(
    content = "",
    webApp = false,
    htmlTemplateEvaluator?: HtmlTemplateEvaluator,
    blobConverter?: BlobConverter,
  ) {
    this.#blobConverter = blobConverter;
    this.#content = content;
    this.#htmlTemplateEvaluator = htmlTemplateEvaluator;
    this.#webApp = webApp;
  }

  addMetaTag(name: string, content: string): this {
    if (!ALLOWED_HTML_META_TAG_NAMES.has(name)) {
      // Apps Script documents the allowed meta tag names but not what happens for unsupported
      // names. Vegas fails closed instead of guessing whether production ignores or rejects them.
      throw new UnsupportedRuntimeOperationError(
        "HtmlOutput.addMetaTag()",
        `meta tag "${name}" is not one of the documented supported names.`,
      );
    }

    this.#metaTags.push(new HtmlOutputMetaTag(name, content));
    return this;
  }

  append(addedContent: string): this {
    // Apps Script documents an error for malformed HTML but does not define its validation
    // boundary. Vegas appends documented valid content without guessing at production parsing.
    this.#content += addedContent;
    return this;
  }

  appendUntrusted(addedContent: string): this {
    this.#content += escapeHtmlContextually(this.#content, addedContent);
    return this;
  }

  asTemplate(): HtmlTemplate {
    return new HtmlTemplate(() => this.#content, this.#htmlTemplateEvaluator);
  }

  clear(): this {
    this.#content = "";
    return this;
  }

  getAs(contentType: string): RuntimeBlob {
    if (this.#blobConverter === undefined) {
      throw new UnsupportedRuntimeOperationError(
        "HtmlOutput.getAs()",
        "Blob conversion is not available in this Runtime context.",
      );
    }

    return convertBlob(this.getBlob(), contentType, this.#blobConverter);
  }

  getBlob(): RuntimeBlob {
    // Apps Script documents that HtmlOutput.getBlob() returns the output data, but does not define
    // the returned Blob metadata. Vegas represents the local Runtime value as UTF-8 text/html with
    // no filename; Google-specific undocumented metadata remains intentionally unspecified.
    return createBlob(this.#content, "text/html", null, this.#blobConverter);
  }

  getContent(): string {
    return this.#content;
  }

  getFaviconUrl(): string {
    return this.#faviconUrl;
  }

  getHeight(): number | null {
    return this.#webApp ? null : this.#height;
  }

  getMetaTags(): HtmlOutputMetaTag[] {
    return [...this.#metaTags];
  }

  getTitle(): string {
    return this.#title;
  }

  getWidth(): number | null {
    return this.#webApp ? null : this.#width;
  }

  setContent(content: string): this {
    // Apps Script documents the same unspecified malformed-HTML validation boundary as append().
    // Vegas accepts documented valid content without inferring a Google-internal parser contract.
    this.#content = content;
    return this;
  }

  setFaviconUrl(iconUrl: string): this {
    this.#faviconUrl = iconUrl;
    return this;
  }

  setHeight(height: number | null): this {
    if (!this.#webApp) {
      this.#height = height;
    }

    return this;
  }

  setSandboxMode(_mode: HtmlSandboxMode): this {
    return this;
  }

  setTitle(title: string): this {
    this.#title = title;
    return this;
  }

  setWidth(width: number | null): this {
    if (!this.#webApp) {
      this.#width = width;
    }

    return this;
  }

  setXFrameOptionsMode(mode: HtmlXFrameOptionsMode): this {
    this.#xFrameOptionsMode = mode;
    return this;
  }

  [SERIALIZE_HTML_OUTPUT](): HtmlOutputSnapshot {
    return {
      content: this.#content,
      faviconUrl: this.#faviconUrl,
      metaTags: this.#metaTags.map((tag) => ({
        name: tag.getName(),
        content: tag.getContent(),
      })),
      title: this.#title,
      xFrameOptionsMode: this.#xFrameOptionsMode,
    };
  }
}

export function serializeHtmlOutput(output: HtmlOutput): HtmlOutputSnapshot {
  return output[SERIALIZE_HTML_OUTPUT]();
}
