import vm from "node:vm";

import { expect, test } from "vitest";

import { projectScriptResult } from "./resultProjection";

test("projects script objects and arrays into the host realm", () => {
  const context = vm.createContext({});

  const scriptValue = new vm.Script(`
      ({
        objectValue: {
          nestedObject: {
            value: 42,
          },
          nestedArray: [
            "value",
            {
              nested: true,
            },
          ],
        },
        arrayValue: [
          "value",
          {
            nested: true,
          },
          [
            1,
            2,
          ],
        ],
      })
    `).runInContext(context);

  const projected = projectScriptResult(scriptValue) as {
    objectValue: {
      nestedObject: object;
      nestedArray: unknown[];
    };
    arrayValue: unknown[];
  };

  expect(Object.getPrototypeOf(projected)).toBe(Object.prototype);

  expect(Object.getPrototypeOf(projected.objectValue)).toBe(Object.prototype);

  expect(Object.getPrototypeOf(projected.objectValue.nestedObject)).toBe(Object.prototype);

  expect(Object.getPrototypeOf(projected.objectValue.nestedArray)).toBe(Array.prototype);

  expect(Object.getPrototypeOf(projected.objectValue.nestedArray[1] as object)).toBe(
    Object.prototype,
  );

  expect(Object.getPrototypeOf(projected.arrayValue)).toBe(Array.prototype);

  expect(Object.getPrototypeOf(projected.arrayValue[1] as object)).toBe(Object.prototype);

  expect(Object.getPrototypeOf(projected.arrayValue[2] as object)).toBe(Array.prototype);
});

test("projects function-valued properties to source text", () => {
  const context = vm.createContext({});

  const scriptValue = new vm.Script(`
      ({
        then(resolve) {
          resolve("thenable-resolve");
        },
      })
    `).runInContext(context);

  const projected = projectScriptResult(scriptValue) as Record<string, unknown>;

  expect(typeof projected.then).toBe("string");
  expect(projected.then).toContain('resolve("thenable-resolve")');
});

test("preserves non-plain objects without fabricating a projection", () => {
  const value = new Date(0);

  expect(projectScriptResult(value)).toBe(value);
});
