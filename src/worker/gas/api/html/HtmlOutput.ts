import { HtmlOutputMetaTag } from "./HtmlOutputMetaTag";

// https://developers.google.com/apps-script/reference/html/html-output
export function HtmlOutput(): GoogleAppsScript.HTML.HtmlOutput {
  let _title = "";
  let _faviconUrl = "";
  let _content = "";
  const metaTags: GoogleAppsScript.HTML.HtmlOutputMetaTag[] = [];
  const allowedMetaTags = [
    "apple-mobile-web-app-capable",
    "google-site-verification",
    "mobile-web-app-capable",
    "viewport",
  ];

  return {
    addMetaTag: function (name: string, content: string) {
      if (allowedMetaTags.includes(name)) {
        metaTags.push(HtmlOutputMetaTag(name, content));
      }
      return this;
    },
    append: function (addedContent: string) {
      _content += addedContent;
      return this;
    },
    appendUntrusted: function (addedContent: string) {
      // TODO: Need to brush up on logic
      return this.append(addedContent.replaceAll("<", "&lt;").replaceAll(">", "&gt;"));
    },
    asTemplate: function () {
      throw new Error("Method not implemented.");
    },
    clear: function () {
      _content = "";
      return this;
    },
    getAs: function (_contentType: string) {
      throw new Error("Method not implemented.");
    },
    getBlob: function () {
      throw new Error("Method not implemented.");
    },
    getContent: function () {
      return _content;
    },
    getFaviconUrl: function () {
      return _faviconUrl;
    },
    getHeight: function () {
      // If published in a web app, it always returns null.
      return null as unknown as GoogleAppsScript.Integer;
    },
    getMetaTags: function () {
      return metaTags;
    },
    getTitle: function () {
      return _title;
    },
    getWidth: function () {
      // If published in a web app, it always returns null.
      return null as unknown as GoogleAppsScript.Integer;
    },
    setContent: function (content: string) {
      _content = content;
      return this;
    },
    setFaviconUrl: function (iconUrl: string) {
      _faviconUrl = iconUrl;
      return this;
    },
    // oxlint-disable-next-line no-unused-vars
    setHeight: function (height: GoogleAppsScript.Integer) {
      // Calling this method has no effect when published in a web app.
      return this;
    },
    // oxlint-disable-next-line no-unused-vars
    setSandboxMode: function (mode: GoogleAppsScript.HTML.SandboxMode) {
      // Only IFRAME mode is now supported.
      return this;
    },
    setTitle: function (title: string) {
      _title = title;
      return this;
    },
    // oxlint-disable-next-line no-unused-vars
    setWidth: function (width: GoogleAppsScript.Integer) {
      // Calling this method has no effect when published in a web app.
      return this;
    },
    setXFrameOptionsMode: function (_mode: GoogleAppsScript.HTML.XFrameOptionsMode) {
      throw new Error("Method not implemented.");
    },
  };
}
