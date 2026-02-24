import { GASHtmlOutputMetaTag } from "./htmloutputmetatag";

// https://developers.google.com/apps-script/reference/html/html-output
export class GASHtmlOutput implements GoogleAppsScript.HTML.HtmlOutput {
  #title: string = "";
  #faviconUrl: string = "";
  #content: string = "";
  readonly #metaTags: GASHtmlOutputMetaTag[] = [];
  readonly #allowedMetaTags: readonly string[] = [
    "apple-mobile-web-app-capable",
    "google-site-verification",
    "mobile-web-app-capable",
    "viewport",
  ];

  addMetaTag = (name: string, content: string) => {
    if (this.#allowedMetaTags.includes(name)) {
      this.#metaTags.push(new GASHtmlOutputMetaTag(name, content));
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
  getAs = (_contentType: string) => {
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
  setHeight = (_height: GoogleAppsScript.Integer) => {
    // Calling this method has no effect when published in a web app.
    return this;
  };
  setSandboxMode = (_mode: GoogleAppsScript.HTML.SandboxMode) => {
    // Only IFRAME mode is now supported.
    return this;
  };
  setTitle = (title: string) => {
    this.#title = title;
    return this;
  };
  setWidth = (_width: GoogleAppsScript.Integer) => {
    // Calling this method has no effect when published in a web app.
    return this;
  };
  setXFrameOptionsMode = (_mode: GoogleAppsScript.HTML.XFrameOptionsMode) => {
    throw new Error("Method not implemented.");
  };
}
