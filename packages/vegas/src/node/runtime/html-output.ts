import type { HtmlSandboxMode, HtmlXFrameOptionsMode } from "./html-enum";

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
  #content: string;
  #faviconUrl = "";
  readonly #metaTags: HtmlOutputMetaTag[] = [];
  #title = "";
  #xFrameOptionsMode: HtmlXFrameOptionsMode = "DEFAULT";

  constructor(content = "") {
    this.#content = content;
  }

  addMetaTag(name: string, content: string): this {
    this.#metaTags.push(new HtmlOutputMetaTag(name, content));
    return this;
  }

  append(addedContent: string): this {
    this.#content += addedContent;
    return this;
  }

  clear(): this {
    this.#content = "";
    return this;
  }

  getContent(): string {
    return this.#content;
  }

  getFaviconUrl(): string {
    return this.#faviconUrl;
  }

  getMetaTags(): HtmlOutputMetaTag[] {
    return [...this.#metaTags];
  }

  getTitle(): string {
    return this.#title;
  }

  setContent(content: string): this {
    this.#content = content;
    return this;
  }

  setFaviconUrl(iconUrl: string): this {
    this.#faviconUrl = iconUrl;
    return this;
  }

  setSandboxMode(_mode: HtmlSandboxMode): this {
    return this;
  }

  setTitle(title: string): this {
    this.#title = title;
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
