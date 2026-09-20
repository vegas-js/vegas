import type { HtmlOutput } from "./html-output";
import { compileHtmlTemplate, compileHtmlTemplateWithComments } from "./html-template-compiler";

type HtmlTemplateContent = string | (() => string);

export type HtmlTemplateEvaluator = (
  code: string,
  bindings: Readonly<Record<string, unknown>>,
) => HtmlOutput;

// https://developers.google.com/apps-script/reference/html/html-template
export class HtmlTemplate {
  [propertyName: string]: unknown;

  readonly #evaluate: HtmlTemplateEvaluator | undefined;
  readonly #readContent: () => string;

  constructor(content: HtmlTemplateContent, evaluate?: HtmlTemplateEvaluator) {
    this.#evaluate = evaluate;
    this.#readContent = typeof content === "string" ? () => content : content;
  }

  evaluate(): HtmlOutput {
    if (this.#evaluate === undefined) {
      throw new Error("HtmlTemplate evaluation requires an Apps Script execution context.");
    }

    return this.#evaluate(this.getCode(), Object.fromEntries(Object.entries(this)));
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
