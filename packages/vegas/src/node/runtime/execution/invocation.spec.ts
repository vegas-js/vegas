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

    expect(await invokeFunction(func)).toEqual({
      value: "value",
    });
  });

  test("using await with async functions", async () => {
    async function func() {
      return "value";
    }

    expect(await invokeFunction(func)).toEqual({
      value: "value",
    });
  });
});

describe("invokeScriptFunction", () => {
  test("resolves and calls a function declaration by name", async () => {
    const context = createEvaluatedContext(`
      function func() {
        return "value";
      }
    `);

    await expect(invokeScriptFunction(context, "func", [])).resolves.toEqual({
      value: "value",
    });
  });

  test("resolves a callable global lexical binding", async () => {
    const context = createEvaluatedContext(`
      const lexicalEntry = () => "lexical";
    `);

    await expect(invokeScriptFunction(context, "lexicalEntry", [])).resolves.toEqual({
      value: "lexical",
    });
  });

  test("resolves an inherited callable binding", async () => {
    const context = createEvaluatedContext("");

    await expect(invokeScriptFunction(context, "toString", [])).resolves.toEqual({
      value: "[object Undefined]",
    });
  });

  test("invokes a non-strict entry with the script global as this", async () => {
    const context = createEvaluatedContext(`
      function entry() {
        return this === globalThis;
      }
    `);

    await expect(invokeScriptFunction(context, "entry", [])).resolves.toEqual({ value: true });
  });

  test("invokes a strict entry with undefined this", async () => {
    const context = createEvaluatedContext(`
      function entry() {
        "use strict";
        return this === undefined;
      }
    `);

    await expect(invokeScriptFunction(context, "entry", [])).resolves.toEqual({ value: true });
  });

  test("passes positional primitive arguments to the resolved function", async () => {
    const context = createEvaluatedContext(`
      function entry(first, second) {
        return first + ":" + second;
      }
    `);

    await expect(invokeScriptFunction(context, "entry", ["arg1", "arg2"])).resolves.toEqual({
      value: "arg1:arg2",
    });
  });

  test("returns an async result", async () => {
    const context = createEvaluatedContext(`
      async function entry() {
        return "value";
      }
    `);

    await expect(invokeScriptFunction(context, "entry", [])).resolves.toEqual({
      value: "value",
    });
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

  test("materializes object and array arguments in the script realm before invocation", async () => {
    const context = createEvaluatedContext(`
      function inspectArgumentRealm(objectValue, arrayValue) {
        return {
          objectPrototype:
            Object.getPrototypeOf(objectValue) === Object.prototype,
          objectConstructor: objectValue.constructor === Object,
          nestedObjectPrototype:
            Object.getPrototypeOf(objectValue.nestedObject) ===
            Object.prototype,
          nestedArrayPrototype:
            Object.getPrototypeOf(objectValue.nestedArray) ===
            Array.prototype,
          arrayPrototype:
            Object.getPrototypeOf(arrayValue) === Array.prototype,
          arrayConstructor: arrayValue.constructor === Array,
          arrayNestedObjectPrototype:
            Object.getPrototypeOf(arrayValue[1]) === Object.prototype,
          arrayNestedArrayPrototype:
            Object.getPrototypeOf(arrayValue[2]) === Array.prototype,
        };
      }
    `);

    const result = await invokeScriptFunction(context, "inspectArgumentRealm", [
      {
        nestedObject: {
          value: 1,
        },
        nestedArray: [1, 2],
      },
      [
        1,
        {
          value: 2,
        },
        [3, 4],
      ],
    ]);

    expect(result.value).toEqual({
      objectPrototype: true,
      objectConstructor: true,
      nestedObjectPrototype: true,
      nestedArrayPrototype: true,
      arrayPrototype: true,
      arrayConstructor: true,
      arrayNestedObjectPrototype: true,
      arrayNestedArrayPrototype: true,
    });
  });
});

test("awaits native Promise results from the script realm", async () => {
  const context = createEvaluatedContext(`
    function entry() {
      return Promise.resolve("promise-value");
    }
  `);

  await expect(invokeScriptFunction(context, "entry", [])).resolves.toEqual({
    value: "promise-value",
  });
});

test("does not assimilate arbitrary thenable results", async () => {
  const context = createEvaluatedContext(`
    let thenCallCount = 0;

    function entry() {
      return {
        marker: "thenable",

        then() {
          thenCallCount += 1;
        }
      };
    }
  `);

  const completion = await invokeScriptFunction(context, "entry", []);

  expect(new vm.Script("thenCallCount").runInContext(context)).toBe(0);

  expect(completion.value).toMatchObject({
    marker: "thenable",
  });

  expect(typeof Reflect.get(completion.value as object, "then")).toBe("function");
});

test("propagates synchronous thrown values without coercion", async () => {
  const context = createEvaluatedContext(`
    const thrownValue = {
      marker: "sync-throw"
    };

    function entry() {
      throw thrownValue;
    }
  `);

  const thrownValue = new vm.Script("thrownValue").runInContext(context);

  await expect(invokeScriptFunction(context, "entry", [])).rejects.toBe(thrownValue);
});

test("propagates native Promise rejections without coercion", async () => {
  const context = createEvaluatedContext(`
    const thrownValue = {
      marker: "promise-rejection"
    };

    function entry() {
      return Promise.reject(thrownValue);
    }
  `);

  const thrownValue = new vm.Script("thrownValue").runInContext(context);

  await expect(invokeScriptFunction(context, "entry", [])).rejects.toBe(thrownValue);
});

test("uses the default argument projection when no materializer is provided", async () => {
  const context = vm.createContext({});

  vm.runInContext(
    `
        function inspect(value) {
          return {
            prototypeIsObjectPrototype:
              Object.getPrototypeOf(value) ===
              Object.prototype,
            constructorIsObject:
              value.constructor === Object,
            value: value.value,
          };
        }
      `,
    context,
  );

  const input = {
    value: "host",
  };

  const result = await invokeScriptFunction(context, "inspect", [input]);

  expect(result.value).toEqual({
    prototypeIsObjectPrototype: true,
    constructorIsObject: true,
    value: "host",
  });
});
