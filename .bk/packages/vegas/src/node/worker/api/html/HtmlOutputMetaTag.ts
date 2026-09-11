// https://developers.google.com/apps-script/reference/html/html-output-meta-tag
export class HtmlOutputMetaTag implements GoogleAppsScript.HTML.HtmlOutputMetaTag {
  readonly #name;
  readonly #content;

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
