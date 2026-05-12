import vm from "node:vm";

import { scriptContext } from "../..";
import { GASAPI } from "../GASAPI";

export class HtmlTemplate extends GASAPI implements GoogleAppsScript.HTML.HtmlTemplate {
  #code: string;

  constructor(code: string) {
    super();
    this.#code = this.#parse(code);
  }

  #generateCode() {
    return `(function() { var output = HtmlService.initTemplateExp(); ${this.#code}\n  /* End of user code */\n  output.flush();\n  return output.$out.append('');\n})();`;
  }

  #parse(code: string) {
    let tmpCode = "";
    let isString = false;
    let isTemplate = false;
    let isFirstStmt = false;
    for (let i = 0; i < code.length; i++) {
      if (!isTemplate && code.charAt(i) === "<" && code.charAt(i + 1) === "?") {
        if (isString) {
          tmpCode += "'; ";
          isString = false;
        }
        if (code.charAt(i + 2) === "=") {
          i += 2;
          tmpCode += "output._$ = ";
        } else if (code.charAt(i + 2) === "!" && code.charAt(i + 3) === "=") {
          i += 3;
          tmpCode += "output._ = ";
        } else {
          i += 1;
        }
        isFirstStmt = true;
        isTemplate = true;
      } else if (isTemplate && code.charAt(i) === "?" && code.charAt(i + 1) === ">") {
        i += 1;
        tmpCode += "; ";
        isTemplate = false;
      } else {
        if (!isString && !isTemplate) {
          tmpCode += "output._ = '";
          isString = true;
        }
        if (isFirstStmt && code.charAt(i) === ";") {
          isFirstStmt = false;
        }
        if (isString || isFirstStmt) {
          tmpCode += code.charAt(i);
        }
      }
    }
    if (isString) {
      tmpCode += "';";
    }

    return tmpCode;
  }

  [propName: string]: any;

  evaluate(): GoogleAppsScript.HTML.HtmlOutput {
    const copyContext = { ...scriptContext };
    Object.entries(this).forEach(([key, value]) => {
      if (!["evaluate", "getCode", "getCodeWithComments", "getRawContent"].includes(key)) {
        copyContext[key] = value;
      }
    });
    return vm.runInContext(this.#generateCode(), vm.createContext(copyContext));
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
