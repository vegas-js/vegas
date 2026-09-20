import { escapeHtmlContextually } from "./html-contextual-escape";
import type { HtmlSandboxMode, HtmlXFrameOptionsMode } from "./html-enum";
import { HtmlTemplate } from "./html-template";

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
  #height: number | null = null;
  readonly #metaTags: HtmlOutputMetaTag[] = [];
  #title = "";
  readonly #webApp: boolean;
  #width: number | null = null;
  #xFrameOptionsMode: HtmlXFrameOptionsMode = "DEFAULT";

  constructor(content = "", webApp = false) {
    this.#content = content;
    this.#webApp = webApp;
  }

  addMetaTag(name: string, content: string): this {
    this.#metaTags.push(new HtmlOutputMetaTag(name, content));
    return this;
  }

  append(addedContent: string): this {
    this.#content += addedContent;
    return this;
  }

  appendUntrusted(addedContent: string): this {
    this.#content += escapeHtmlContextually(this.#content, addedContent);
    return this;
  }

  asTemplate(): HtmlTemplate {
    return new HtmlTemplate(() => this.#content);
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
