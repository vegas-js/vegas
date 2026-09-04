import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { createVmGasObjectFactory } from "../../globals/object";
import { RuntimeServicePort } from "../../protocol";
import { Range } from "./Range";
import { Sheet } from "./Sheet";
import { createSheetObjectFacade, SHEET_GAS_METHOD_NAMES } from "./sheetObjectFacade";

function unexpected(): never {
  throw new Error("Unexpected dependency call");
}

function createImplementation() {
  return new Sheet(
    "spreadsheet-id",
    0,
    unexpected,
    {
      getLastRow: unexpected,
      getLastColumn: unexpected,
      getMaxRows: unexpected,
      getMaxColumns: unexpected,
      getSheetName: unexpected,
    },
    unexpected,
  );
}

describe("createSheetObjectFacade", () => {
  test("creates a Sheet facade in the supplied VM realm", () => {
    const context = vm.createContext({});

    const createObject = createVmGasObjectFactory(context);

    const sheet = createSheetObjectFacade(createImplementation(), createObject);

    context.sheet = sheet;

    expect(vm.runInContext("Object.getPrototypeOf(sheet) === Object.prototype", context)).toBe(
      true,
    );

    expect(vm.runInContext("sheet.constructor === Object", context)).toBe(true);

    expect(Object.prototype.toString.call(sheet)).toBe("[object Object]");
  });

  test("creates the characterized Sheet own method surface", () => {
    const sheet = createSheetObjectFacade(createImplementation());

    const expectedNames = [...SHEET_GAS_METHOD_NAMES, "toString"];

    expect(Object.getOwnPropertyNames(sheet).sort()).toEqual([...expectedNames].sort());

    for (const name of expectedNames) {
      expect(Object.getOwnPropertyDescriptor(sheet, name)).toMatchObject({
        configurable: true,
        enumerable: true,
        writable: true,
      });

      expect(typeof (sheet as unknown as Record<string, unknown>)[name]).toBe("function");
    }

    expect(String(sheet as any)).toBe("Sheet");
  });

  test("delegates implemented Sheet methods", () => {
    const sheet = createSheetObjectFacade(createImplementation());

    expect(sheet.getSheetId()).toBe(0);
  });

  test("does not expose the internal receiver from delegated methods", () => {
    const implementation = createImplementation();

    (implementation as any).clearContents = () => implementation;

    const sheet = createSheetObjectFacade(implementation);

    expect((sheet as any).clearContents()).toBe(sheet);
  });
});

test("returns fresh Range facades from getRange", () => {
  const rangeService: RuntimeServicePort<"Range"> = {
    getValue: () => null,
    getValues: () => [[]],
    setValue: () => undefined,
    setValues: () => undefined,
  };

  const createRange = (
    spreadsheetId: string,
    sheetId: number,
    row: number,
    column: number,
    numRows: number,
    numColumns: number,
  ) => new Range(spreadsheetId, sheetId, row, column, numRows, numColumns, rangeService);

  const sheet = createSheetObjectFacade(
    new Sheet(
      "spreadsheet-id",
      0,
      createRange,
      {
        getLastRow: () => 0,
        getLastColumn: () => 0,
        getMaxRows: () => 10,
        getMaxColumns: () => 10,
        getSheetName: () => "Sheet1",
      },
      () => {
        throw new Error("Unexpected legacy request");
      },
    ),
  );

  const rangeA = sheet.getRange("A1:B2");

  const rangeB = sheet.getRange("A1:B2");

  const coordinateRange = sheet.getRange(1, 1, 2, 2);

  expect(rangeA).not.toBe(rangeB);

  expect(rangeA).not.toBe(coordinateRange);

  expect(Object.getPrototypeOf(rangeA)).toBe(Object.prototype);

  expect(String(rangeA as any)).toBe("Range");

  expect(rangeA.getCell(1, 1)).not.toBe(rangeA.getCell(1, 1));
});
