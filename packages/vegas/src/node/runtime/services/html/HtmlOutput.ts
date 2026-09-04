import { escapeHtml } from "./escapeHtml";
import { HtmlOutputMetaTag } from "./HtmlOutputMetaTag";

function createGasException(message: string): Error {
  const error = new Error(message);
  error.name = "Exception";
  return error;
}

// https://developers.google.com/apps-script/reference/html/html-output
export class HtmlOutput implements GoogleAppsScript.HTML.HtmlOutput {
  readonly #allowedMetaTags: readonly string[];

  #title: string;
  #faviconUrl: string | null;
  #content: string;
  #metaTags: GoogleAppsScript.HTML.HtmlOutputMetaTag[];
  #height: GoogleAppsScript.Integer | null;
  #width: GoogleAppsScript.Integer | null;
  #defaultXFrameOptionsMode: GoogleAppsScript.HTML.XFrameOptionsMode;
  #xFrameOptionsMode: GoogleAppsScript.HTML.XFrameOptionsMode;

  constructor(content: string, defaultXFrameOptionsMode: GoogleAppsScript.HTML.XFrameOptionsMode) {
    this.#allowedMetaTags = [
      "apple-mobile-web-app-capable",
      "google-site-verification",
      "mobile-web-app-capable",
      "viewport",
    ];

    this.#title = "";
    this.#faviconUrl = null;
    this.#content = content;
    this.#metaTags = [];
    this.#height = null;
    this.#width = null;
    this.#metaTags = [];
    this.#defaultXFrameOptionsMode = defaultXFrameOptionsMode;
    this.#xFrameOptionsMode = defaultXFrameOptionsMode;
  }

  getXFrameOptionsMode() {
    return this.#xFrameOptionsMode === this.#defaultXFrameOptionsMode ? "SAMEORIGIN" : undefined;
  }

  addMetaTag = (name: string, content: string) => {
    if (!this.#allowedMetaTags.includes(name)) {
      throw createGasException("The meta tag you specified is not allowed in this context.");
    }

    this.#metaTags.push(new HtmlOutputMetaTag(name, content));

    return this;
  };
  append = (addedContent: string) => {
    this.#content += addedContent;
    return this;
  };
  appendUntrusted = (addedContent: string) => {
    return this.append(escapeHtml(addedContent));
  };
  asTemplate = () => {
    throw new Error("Method not implemented.");
  };
  clear = () => {
    this.#content = "";
    return this;
  };
  getAs = (contentType: string) => {
    throw new Error("Method not implemented.");
  };
  getBlob = () => {
    throw new Error("Method not implemented.");
  };
  getContent = () => {
    return this.#content;
  };
  getFaviconUrl = () => {
    return this.#faviconUrl as unknown as string;
  };
  getHeight = () => {
    return this.#height as unknown as GoogleAppsScript.Integer;
  };
  getMetaTags = () => {
    return this.#metaTags;
  };
  getTitle = () => {
    return this.#title;
  };
  getWidth = () => {
    return this.#width as unknown as GoogleAppsScript.Integer;
  };
  setContent = (content: string) => {
    this.#content = content;
    return this;
  };
  setFaviconUrl = (iconUrl: string) => {
    this.#faviconUrl = iconUrl;
    return this;
  };
  setHeight = (height: GoogleAppsScript.Integer) => {
    this.#height = height;
    return this;
  };
  // oxlint-disable-next-line no-unused-vars
  setSandboxMode = (mode: GoogleAppsScript.HTML.SandboxMode) => {
    // Only IFRAME mode is now supported.
    return this;
  };
  setTitle = (title: string) => {
    this.#title = title;
    return this;
  };
  setWidth = (width: GoogleAppsScript.Integer) => {
    this.#width = width;
    return this;
  };
  setXFrameOptionsMode = (mode: GoogleAppsScript.HTML.XFrameOptionsMode) => {
    this.#xFrameOptionsMode = mode;
    return this;
  };
}
