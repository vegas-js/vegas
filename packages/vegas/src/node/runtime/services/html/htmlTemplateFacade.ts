import type { CreateGasObject } from "../../globals/object";

export interface HtmlTemplateImplementation extends GoogleAppsScript.HTML.HtmlTemplate {
  evaluateWithBindings(bindings: Record<string, unknown>): GoogleAppsScript.HTML.HtmlOutput;
}

const defaultCreateGasObject: CreateGasObject = () => ({});

export function createHtmlTemplateFacade(
  implementation: HtmlTemplateImplementation,
  createObject: CreateGasObject = defaultCreateGasObject,
): GoogleAppsScript.HTML.HtmlTemplate {
  const value = createObject();

  const defineMethod = (name: string, method: (...args: any[]) => unknown) => {
    Object.defineProperty(value, name, {
      value: method,
      configurable: true,
      enumerable: false,
      writable: true,
    });
  };

  defineMethod("toString", () => "HtmlTemplate");

  defineMethod("evaluate", () => {
    const bindings: Record<string, unknown> = {};

    for (const [name, bindingValue] of Object.entries(value)) {
      bindings[name] = bindingValue;
    }

    return implementation.evaluateWithBindings(bindings);
  });

  defineMethod("getCode", () => implementation.getCode());

  defineMethod("getCodeWithComments", () => implementation.getCodeWithComments());

  defineMethod("getRawContent", () => implementation.getRawContent());

  return value as unknown as GoogleAppsScript.HTML.HtmlTemplate;
}
