import vm from "node:vm";

import { describe, expect, test, vi } from "vitest";

import { createVmGasObjectFactory } from "../../globals/object";
import { HtmlTemplate } from "./HtmlTemplate";
import { createHtmlTemplateFacade } from "./htmlTemplateFacade";

describe("createHtmlTemplateFacade", () => {
  test("creates an HtmlTemplate facade in the supplied VM realm", () => {
    const context = vm.createContext({});
    const createObject = createVmGasObjectFactory(context);

    const evaluator = vi.fn(() => ({}) as GoogleAppsScript.HTML.HtmlOutput);

    const template = createHtmlTemplateFacade(
      new HtmlTemplate("<p>vegas-reference</p>", evaluator),
      createObject,
    );

    context.template = template;

    expect(vm.runInContext("Object.getPrototypeOf(template) === Object.prototype", context)).toBe(
      true,
    );

    expect(vm.runInContext("template.constructor === Object", context)).toBe(true);

    expect(Object.prototype.toString.call(template)).toBe("[object Object]");
  });

  test("creates GAS-compatible non-enumerable HtmlTemplate own methods", () => {
    const evaluator = vi.fn(() => ({}) as GoogleAppsScript.HTML.HtmlOutput);

    const template = createHtmlTemplateFacade(
      new HtmlTemplate("<p>vegas-reference</p>", evaluator),
    );

    const methodNames = ["evaluate", "getCode", "getCodeWithComments", "getRawContent", "toString"];

    expect(Object.getOwnPropertyNames(template).sort()).toEqual([...methodNames].sort());

    expect(Object.keys(template)).toEqual([]);

    for (const name of methodNames) {
      expect(Object.getOwnPropertyDescriptor(template, name)).toMatchObject({
        configurable: true,
        enumerable: false,
        writable: true,
      });

      expect(typeof (template as unknown as Record<string, unknown>)[name]).toBe("function");
    }

    expect(String(template as any)).toBe("HtmlTemplate");
  });

  test("uses ordinary enumerable own properties for HtmlTemplate bindings", () => {
    const evaluator = vi.fn(() => ({}) as GoogleAppsScript.HTML.HtmlOutput);

    const template = createHtmlTemplateFacade(
      new HtmlTemplate("<p><?= referenceValue ?></p>", evaluator),
    ) as any;

    template.referenceValue = "vegas-reference";

    expect(Object.prototype.hasOwnProperty.call(template, "referenceValue")).toBe(true);

    expect(Object.getOwnPropertyDescriptor(template, "referenceValue")).toEqual({
      value: "vegas-reference",
      configurable: true,
      enumerable: true,
      writable: true,
    });

    expect(Object.keys(template)).toEqual(["referenceValue"]);
  });

  test("evaluates with current facade bindings", () => {
    const outputA = {} as GoogleAppsScript.HTML.HtmlOutput;

    const outputB = {} as GoogleAppsScript.HTML.HtmlOutput;

    const evaluator = vi.fn().mockReturnValueOnce(outputA).mockReturnValueOnce(outputB);

    const template = createHtmlTemplateFacade(
      new HtmlTemplate("<p><?= referenceValue ?></p>", evaluator),
    ) as any;

    template.referenceValue = "first";

    expect(template.evaluate()).toBe(outputA);

    expect(evaluator).toHaveBeenLastCalledWith(expect.any(String), {
      referenceValue: "first",
    });

    delete template.referenceValue;
    template.otherValue = "second";

    expect(template.evaluate()).toBe(outputB);

    expect(evaluator).toHaveBeenLastCalledWith(expect.any(String), {
      otherValue: "second",
    });
  });
});
