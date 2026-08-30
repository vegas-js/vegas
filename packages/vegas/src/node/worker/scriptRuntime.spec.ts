import vm from "node:vm";

import { expect, test } from "vitest";

import { evaluateScript } from "./scriptRuntime";

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
