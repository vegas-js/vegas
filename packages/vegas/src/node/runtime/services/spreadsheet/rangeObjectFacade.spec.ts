import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { createVmGasObjectFactory } from "../../globals/object";
import type { RuntimeServicePort } from "../../protocol";
import { Range } from "./Range";
import { createRangeObjectFacade, RANGE_GAS_METHOD_NAMES } from "./rangeObjectFacade";

function unexpected(): never {
  throw new Error("Unexpected dependency call");
}

const service: RuntimeServicePort<"Range"> = {
  getValue: unexpected,
  getValues: unexpected,
  setValue: unexpected,
  setValues: unexpected,
};

function createImplementation() {
  return new Range("spreadsheet-id", 0, 1, 1, 2, 2, service);
}

describe("createRangeObjectFacade", () => {
  test("creates a Range facade in the supplied VM realm", () => {
    const context = vm.createContext({});

    const createObject = createVmGasObjectFactory(context);

    const range = createRangeObjectFacade(createImplementation(), createObject);

    context.range = range;

    expect(vm.runInContext("Object.getPrototypeOf(range) === Object.prototype", context)).toBe(
      true,
    );

    expect(vm.runInContext("range.constructor === Object", context)).toBe(true);

    expect(Object.prototype.toString.call(range)).toBe("[object Object]");
  });

  test("creates the characterized Range own method surface", () => {
    const range = createRangeObjectFacade(createImplementation());

    const expectedNames = [...RANGE_GAS_METHOD_NAMES, "toString"];

    expect(Object.getOwnPropertyNames(range).sort()).toEqual([...expectedNames].sort());

    expect(expectedNames).toHaveLength(191);

    for (const name of expectedNames) {
      expect(Object.getOwnPropertyDescriptor(range, name)).toMatchObject({
        configurable: true,
        enumerable: true,
        writable: true,
      });

      expect(typeof (range as unknown as Record<string, unknown>)[name]).toBe("function");
    }

    expect(String(range as any)).toBe("Range");
  });

  test("returns fresh Range facades from getCell", () => {
    const context = vm.createContext({});

    const createObject = createVmGasObjectFactory(context);

    const range = createRangeObjectFacade(createImplementation(), createObject);

    const cellA = range.getCell(1, 1);

    const cellB = range.getCell(1, 1);

    expect(cellA).not.toBe(cellB);
    expect(cellA).not.toBe(range);

    context.cellA = cellA;

    expect(vm.runInContext("Object.getPrototypeOf(cellA) === Object.prototype", context)).toBe(
      true,
    );

    expect(Object.prototype.toString.call(cellA)).toBe("[object Object]");

    expect(String(cellA as any)).toBe("Range");

    expect(Object.getOwnPropertyNames(cellA).sort()).toEqual(
      Object.getOwnPropertyNames(range).sort(),
    );
  });

  test("returns distinct Range facades from setValue and setValues", () => {
    const implementation = createImplementation();

    (implementation as any).setValue = () => implementation;
    (implementation as any).setValues = () => implementation;

    const range = createRangeObjectFacade(implementation);

    const setValueResult = (range as any).setValue("value");

    const setValuesResult = (range as any).setValues([
      ["a", "b"],
      ["c", "d"],
    ]);

    expect(setValueResult).not.toBe(range);
    expect(String(setValueResult)).toBe("Range");

    expect(setValuesResult).not.toBe(range);
    expect(String(setValuesResult)).toBe("Range");
  });
});
