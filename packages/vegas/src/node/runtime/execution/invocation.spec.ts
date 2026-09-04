import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { invokeFunction, invokeScriptFunction } from "./invocation";
import { evaluateScript } from "./scriptRuntime";

function createEvaluatedContext(source: string): vm.Context {
  const context = vm.createContext({});

  evaluateScript(source, context);

  return context;
}

describe("invokeFunction", () => {
  test("return the return value of a regular function as-is", async () => {
    function func() {
      return "value";
    }

    expect(await invokeFunction(func)).toEqual("value");
  });

  test("using await with async functions", async () => {
    async function func() {
      return "value";
    }

    expect(await invokeFunction(func)).toEqual("value");
  });
});

describe("invokeScriptFunction", () => {
  test("resolves and calls a function declaration by name", async () => {
    const context = createEvaluatedContext(`
      function func() {
        return "value";
      }
    `);

    await expect(invokeScriptFunction(context, "func", [])).resolves.toBe("value");
  });

  test("resolves a callable global lexical binding", async () => {
    const context = createEvaluatedContext(`
      const lexicalEntry = () => "lexical";
    `);

    await expect(invokeScriptFunction(context, "lexicalEntry", [])).resolves.toBe("lexical");
  });

  test("resolves an inherited callable binding", async () => {
    const context = createEvaluatedContext("");

    await expect(invokeScriptFunction(context, "toString", [])).resolves.toBe("[object Undefined]");
  });

  test("invokes a non-strict entry with the script global as this", async () => {
    const context = createEvaluatedContext(`
      function entry() {
        return this === globalThis;
      }
    `);

    await expect(invokeScriptFunction(context, "entry", [])).resolves.toBe(true);
  });

  test("invokes a strict entry with undefined this", async () => {
    const context = createEvaluatedContext(`
      function entry() {
        "use strict";
        return this === undefined;
      }
    `);

    await expect(invokeScriptFunction(context, "entry", [])).resolves.toBe(true);
  });

  test("passes positional primitive arguments to the resolved function", async () => {
    const context = createEvaluatedContext(`
      function entry(first, second) {
        return first + ":" + second;
      }
    `);

    await expect(invokeScriptFunction(context, "entry", ["arg1", "arg2"])).resolves.toBe(
      "arg1:arg2",
    );
  });

  test("returns an async result", async () => {
    const context = createEvaluatedContext(`
      async function entry() {
        return "value";
      }
    `);

    await expect(invokeScriptFunction(context, "entry", [])).resolves.toBe("value");
  });

  test("rejects a missing binding as a missing script function", async () => {
    const context = createEvaluatedContext("");

    await expect(invokeScriptFunction(context, "missingEntry", [])).rejects.toMatchObject({
      name: "ScriptFunctionNotFoundError",
      message: "Script function not found: missingEntry",
      functionName: "missingEntry",
    });
  });

  test("rejects a non-callable binding as a missing script function", async () => {
    const context = createEvaluatedContext(`
      const nonCallableEntry = "value";
    `);

    await expect(invokeScriptFunction(context, "nonCallableEntry", [])).rejects.toMatchObject({
      name: "ScriptFunctionNotFoundError",
      message: "Script function not found: nonCallableEntry",
      functionName: "nonCallableEntry",
    });
  });

  test("rejects invalid entry names without evaluating them", async () => {
    const context = createEvaluatedContext(`
      var mutated = false;

      function entry() {
        return "value";
      }
    `);

    await expect(invokeScriptFunction(context, "entry; mutated = true", [])).rejects.toMatchObject({
      name: "ScriptFunctionNotFoundError",
    });

    expect(new vm.Script("mutated").runInContext(context)).toBe(false);
  });
});
