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

  addMetaTag(name: string, content: string): GoogleAppsScript.HTML.HtmlOutput {
    if (this.#allowedMetaTags.includes(name)) {
      this.#metaTags.push(new GASHtmlOutputMetaTag(name, content));
    }
    return this;
  }
  append(addedContent: string): GoogleAppsScript.HTML.HtmlOutput {
    this.#content += addedContent;
    return this;
  }
  appendUntrusted(addedContent: string): GoogleAppsScript.HTML.HtmlOutput {
    // TODO: Need to brush up on logic
    return this.append(addedContent.replaceAll("<", "&lt;").replaceAll(">", "&gt;"));
  }
  asTemplate(): GoogleAppsScript.HTML.HtmlTemplate {
    throw new Error("Method not implemented.");
  }
  clear(): GoogleAppsScript.HTML.HtmlOutput {
    this.#content = "";
    return this;
  }
  getAs(_contentType: string): GoogleAppsScript.Base.Blob {
    throw new Error("Method not implemented.");
  }
  getBlob(): GoogleAppsScript.Base.Blob {
    throw new Error("Method not implemented.");
  }
  getContent(): string {
    return this.#content;
  }
  getFaviconUrl(): string {
    return this.#faviconUrl;
  }
  getHeight(): GoogleAppsScript.Integer {
    // If published in a web app, it always returns null.
    return null as unknown as GoogleAppsScript.Integer;
  }
  getMetaTags(): GoogleAppsScript.HTML.HtmlOutputMetaTag[] {
    return this.#metaTags;
  }
  getTitle(): string {
    return this.#title;
  }
  getWidth(): GoogleAppsScript.Integer {
    // If published in a web app, it always returns null.
    return null as unknown as GoogleAppsScript.Integer;
  }
  setContent(content: string): GoogleAppsScript.HTML.HtmlOutput {
    this.#content = content;
    return this;
  }
  setFaviconUrl(iconUrl: string): GoogleAppsScript.HTML.HtmlOutput {
    this.#faviconUrl = iconUrl;
    return this;
  }
  setHeight(_height: GoogleAppsScript.Integer): GoogleAppsScript.HTML.HtmlOutput {
    // Calling this method has no effect when published in a web app.
    return this;
  }
  setSandboxMode(_mode: GoogleAppsScript.HTML.SandboxMode): GoogleAppsScript.HTML.HtmlOutput {
    // Only IFRAME mode is now supported.
    return this;
  }
  setTitle(title: string): GoogleAppsScript.HTML.HtmlOutput {
    this.#title = title;
    return this;
  }
  setWidth(_width: GoogleAppsScript.Integer): GoogleAppsScript.HTML.HtmlOutput {
    // Calling this method has no effect when published in a web app.
    return this;
  }
  setXFrameOptionsMode(
    _mode: GoogleAppsScript.HTML.XFrameOptionsMode,
  ): GoogleAppsScript.HTML.HtmlOutput {
    throw new Error("Method not implemented.");
  }
}
