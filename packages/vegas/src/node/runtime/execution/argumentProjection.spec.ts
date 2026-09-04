import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { projectScriptArguments } from "./argumentProjection";

describe("projectScriptArguments", () => {
  test("materializes object and array arguments recursively in the script realm", () => {
    const context = vm.createContext({});

    const objectArgument = {
      nestedObject: {
        value: 1,
      },
      nestedArray: [1, { value: 2 }],
    };

    const arrayArgument = [1, { value: 2 }, [3, 4]];

    const projectedArguments = projectScriptArguments(context, [
      "value",
      42,
      true,
      null,
      objectArgument,
      arrayArgument,
    ]);

    const projectedObject = projectedArguments[4];
    const projectedArray = projectedArguments[5];

    context.projectedObject = projectedObject;
    context.projectedArray = projectedArray;

    const observation = new vm.Script(`
      ({
        objectValue: {
          prototypeIsObjectPrototype:
            Object.getPrototypeOf(projectedObject) === Object.prototype,
          constructorIsObject: projectedObject.constructor === Object,
          nestedObject: {
            prototypeIsObjectPrototype:
              Object.getPrototypeOf(projectedObject.nestedObject) ===
              Object.prototype,
            constructorIsObject:
              projectedObject.nestedObject.constructor === Object,
          },
          nestedArray: {
            isArray: Array.isArray(projectedObject.nestedArray),
            prototypeIsArrayPrototype:
              Object.getPrototypeOf(projectedObject.nestedArray) ===
              Array.prototype,
            constructorIsArray:
              projectedObject.nestedArray.constructor === Array,
          },
          nestedArrayObject: {
            prototypeIsObjectPrototype:
              Object.getPrototypeOf(projectedObject.nestedArray[1]) ===
              Object.prototype,
            constructorIsObject:
              projectedObject.nestedArray[1].constructor === Object,
          },
        },
        arrayValue: {
          isArray: Array.isArray(projectedArray),
          prototypeIsArrayPrototype:
            Object.getPrototypeOf(projectedArray) === Array.prototype,
          constructorIsArray: projectedArray.constructor === Array,
          nestedObject: {
            prototypeIsObjectPrototype:
              Object.getPrototypeOf(projectedArray[1]) === Object.prototype,
            constructorIsObject: projectedArray[1].constructor === Object,
          },
          nestedArray: {
            isArray: Array.isArray(projectedArray[2]),
            prototypeIsArrayPrototype:
              Object.getPrototypeOf(projectedArray[2]) === Array.prototype,
            constructorIsArray: projectedArray[2].constructor === Array,
          },
        },
      })
    `).runInContext(context);

    expect(observation).toEqual({
      objectValue: {
        prototypeIsObjectPrototype: true,
        constructorIsObject: true,
        nestedObject: {
          prototypeIsObjectPrototype: true,
          constructorIsObject: true,
        },
        nestedArray: {
          isArray: true,
          prototypeIsArrayPrototype: true,
          constructorIsArray: true,
        },
        nestedArrayObject: {
          prototypeIsObjectPrototype: true,
          constructorIsObject: true,
        },
      },
      arrayValue: {
        isArray: true,
        prototypeIsArrayPrototype: true,
        constructorIsArray: true,
        nestedObject: {
          prototypeIsObjectPrototype: true,
          constructorIsObject: true,
        },
        nestedArray: {
          isArray: true,
          prototypeIsArrayPrototype: true,
          constructorIsArray: true,
        },
      },
    });

    expect(projectedObject).not.toBe(objectArgument);
    expect(projectedArray).not.toBe(arrayArgument);
  });

  test("preserves primitive argument values", () => {
    const context = vm.createContext({});

    expect(projectScriptArguments(context, ["value", 42, true, null])).toEqual([
      "value",
      42,
      true,
      null,
    ]);
  });
});
