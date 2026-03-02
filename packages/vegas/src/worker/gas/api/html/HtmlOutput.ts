import { HtmlOutputMetaTag } from "./HtmlOutputMetaTag";

// https://developers.google.com/apps-script/reference/html/html-output
export class HtmlOutput implements GoogleAppsScript.HTML.HtmlOutput {
  readonly #allowedMetaTags: readonly string[];

  #title: string;
  #faviconUrl: string;
  #content: string;
  #metaTags: GoogleAppsScript.HTML.HtmlOutputMetaTag[];

  constructor(content: string) {
    this.#allowedMetaTags = [
      "apple-mobile-web-app-capable",
      "google-site-verification",
      "mobile-web-app-capable",
      "viewport",
    ];

    this.#title = "";
    this.#faviconUrl = "";
    this.#content = content;
    this.#metaTags = [];
  }

  addMetaTag = (name: string, content: string) => {
    if (this.#allowedMetaTags.includes(name)) {
      this.#metaTags.push(new HtmlOutputMetaTag(name, content));
    }
    return this;
  };
  append = (addedContent: string) => {
    this.#content += addedContent;
    return this;
  };
  appendUntrusted = (addedContent: string) => {
    // TODO: Need to brush up on logic
    return this.append(addedContent.replaceAll("<", "&lt;").replaceAll(">", "&gt;"));
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
    return this.#faviconUrl;
  };
  getHeight = () => {
    // If published in a web app, it always returns null.
    return null as unknown as GoogleAppsScript.Integer;
  };
  getMetaTags = () => {
    return this.#metaTags;
  };
  getTitle = () => {
    return this.#title;
  };
  getWidth = () => {
    // If published in a web app, it always returns null.
    return null as unknown as GoogleAppsScript.Integer;
  };
  setContent = (content: string) => {
    this.#content = content;
    return this;
  };
  setFaviconUrl = (iconUrl: string) => {
    this.#faviconUrl = iconUrl;
    return this;
  };
  // oxlint-disable-next-line no-unused-vars
  setHeight = (height: GoogleAppsScript.Integer) => {
    // Calling this method has no effect when published in a web app.
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
  // oxlint-disable-next-line no-unused-vars
  setWidth = (width: GoogleAppsScript.Integer) => {
    // Calling this method has no effect when published in a web app.
    return this;
  };
  setXFrameOptionsMode = (mode: GoogleAppsScript.HTML.XFrameOptionsMode) => {
    throw new Error("Method not implemented.");
  };
}
