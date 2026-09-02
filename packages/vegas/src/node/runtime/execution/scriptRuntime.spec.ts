import vm from "node:vm";

import { expect, test } from "vitest";

import { evaluateScript, evaluateScriptWithBindings } from "./scriptRuntime";

test("evaluates code in the specified context", () => {
  const context = vm.createContext({});
  evaluateScript("function hello() { return 'hello'; }", context);

  expect(typeof context.hello).toBe("function");
  expect(context.hello()).toBe("hello");
});

test("evaluates code references global context", () => {
  const context = vm.createContext({ value: "from context" });
  evaluateScript("function getValue() { return value; }", context);

  expect(context.getValue()).toBe("from context");
});

test("throw syntax error", () => {
  const context = vm.createContext({});

  expect(() => evaluateScript("function { return value; }", context)).toThrow("Unexpected token");
});

test("throw runtime error", () => {
  const context = vm.createContext({});

  expect(() => evaluateScript("throw new Error('throw from context');", context)).toThrow(
    "throw from context",
  );
});

test("bindings preserve non-enumerable globals", () => {
  const context = vm.createContext({});
  Object.defineProperty(context, "GasGlobal", {
    value: "gas",
    configurable: true,
    enumerable: false,
    writable: true,
  });
  const result = evaluateScriptWithBindings<string>("`${GasGlobal}:${value}`", context, {
    value: "binding",
  });

  expect(result).toBe("gas:binding");
});

test("restores an existing property after evaluation", () => {
  const context = vm.createContext({});
  Object.defineProperty(context, "value", {
    value: "original",
    configurable: true,
    enumerable: false,
    writable: true,
  });
  const previousDescriptor = Object.getOwnPropertyDescriptor(context, "value");

  expect(
    evaluateScriptWithBindings("value", context, {
      value: "temporary",
    }),
  ).toBe("temporary");
  expect(context.value).toBe("original");
  expect(Object.getOwnPropertyDescriptor(context, "value")).toEqual(previousDescriptor);
});

test("restores bindings when evaluation throws", () => {
  const context = vm.createContext({});

  expect(() =>
    evaluateScriptWithBindings("(() => { throw new Error('boom'); })()", context, {
      temporary: "value",
    }),
  ).toThrow("boom");
  expect(Object.hasOwn(context, "temporary")).toBe(false);
});
