import { compileHtmlTemplate, compileHtmlTemplateWithComments } from "./html-template-compiler";

type HtmlTemplateContent = string | (() => string);

// https://developers.google.com/apps-script/reference/html/html-template
export class HtmlTemplate {
  readonly #readContent: () => string;

  constructor(content: HtmlTemplateContent) {
    this.#readContent = typeof content === "string" ? () => content : content;
  }

  getCode(): string {
    return compileHtmlTemplate(this.#readContent());
  }

  getCodeWithComments(): string {
    return compileHtmlTemplateWithComments(this.#readContent());
  }

  getRawContent(): string {
    return this.#readContent();
  }
}
