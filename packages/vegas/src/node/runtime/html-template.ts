type HtmlTemplateContent = string | (() => string);

// https://developers.google.com/apps-script/reference/html/html-template
export class HtmlTemplate {
  readonly #readContent: () => string;

  constructor(content: HtmlTemplateContent) {
    this.#readContent = typeof content === "string" ? () => content : content;
  }

  getRawContent(): string {
    return this.#readContent();
  }
}
