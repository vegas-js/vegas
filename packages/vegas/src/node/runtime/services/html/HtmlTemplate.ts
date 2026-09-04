import type { EvaluateHtmlTemplate } from "../../execution/types";
import { GASAPI } from "../../legacy/GASAPI";

export class HtmlTemplate extends GASAPI implements GoogleAppsScript.HTML.HtmlTemplate {
  #code: string;
  #evaluateTemplate: EvaluateHtmlTemplate;

  constructor(code: string, evaluateTemplate: EvaluateHtmlTemplate) {
    super();
    this.#code = this.#parse(code);
    this.#evaluateTemplate = evaluateTemplate;
  }

  #generateCode() {
    return `(function() { var output = HtmlService.initTemplateExp(); ${this.#code}\n  /* End of user code */\n  output.flush();\n  return output.$out.append('');\n})();`;
  }

  #parse(code: string) {
    let generated = "";
    let cursor = 0;

    const appendLiteral = (value: string) => {
      if (value === "") {
        return;
      }

      generated += `output._ = ${JSON.stringify(value)}; `;
    };

    while (cursor < code.length) {
      const openIndex = code.indexOf("<?", cursor);

      if (openIndex === -1) {
        appendLiteral(code.slice(cursor));
        break;
      }

      appendLiteral(code.slice(cursor, openIndex));

      let bodyStart: number;
      let mode: "escaped" | "raw" | "statement";

      if (code.startsWith("<?!=", openIndex)) {
        mode = "raw";
        bodyStart = openIndex + 4;
      } else if (code.startsWith("<?=", openIndex)) {
        mode = "escaped";
        bodyStart = openIndex + 3;
      } else {
        mode = "statement";
        bodyStart = openIndex + 2;
      }

      const closeIndex = code.indexOf("?>", bodyStart);

      const bodyEnd = closeIndex === -1 ? code.length : closeIndex;

      const body = code.slice(bodyStart, bodyEnd);

      switch (mode) {
        case "escaped":
          generated += `output._$ = (${body}); `;
          break;

        case "raw":
          generated += `output._ = (${body}); `;
          break;

        case "statement":
          generated += `${body} `;
          break;
      }

      if (closeIndex === -1) {
        break;
      }

      cursor = closeIndex + 2;
    }

    return generated;
  }

  [propName: string]: any;

  evaluateWithBindings(bindings: Record<string, unknown>): GoogleAppsScript.HTML.HtmlOutput {
    return this.#evaluateTemplate(this.#generateCode(), bindings);
  }

  evaluate(): GoogleAppsScript.HTML.HtmlOutput {
    const bindings: Record<string, unknown> = {};
    Object.entries(this).forEach(([key, value]) => {
      if (!["evaluate", "getCode", "getCodeWithComments", "getRawContent"].includes(key)) {
        bindings[key] = value;
      }
    });

    return this.evaluateWithBindings(bindings);
  }
  getCode(): string {
    return this.#generateCode();
  }
  getCodeWithComments(): string {
    throw new Error("Method not implemented.");
  }
  getRawContent(): string {
    throw new Error("Method not implemented.");
  }
}
