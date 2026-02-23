// https://developers.google.com/apps-script/reference/html/html-output-meta-tag
export class GASHtmlOutputMetaTag implements GoogleAppsScript.HTML.HtmlOutputMetaTag {
  readonly #name: string;
  readonly #content: string;

  constructor(name: string, content: string) {
    this.#name = name;
    this.#content = content;
  }

  getContent = () => {
    return this.#content;
  };
  getName = () => {
    return this.#name;
  };
}
