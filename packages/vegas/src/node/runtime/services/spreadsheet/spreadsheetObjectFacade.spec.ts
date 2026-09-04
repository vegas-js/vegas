import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { createVmGasObjectFactory } from "../../globals/object";
import { Sheet } from "./Sheet";
import { Spreadsheet } from "./Spreadsheet";
import {
  createSpreadsheetObjectFacade,
  SPREADSHEET_GAS_METHOD_NAMES,
} from "./spreadsheetObjectFacade";

function unexpected(): never {
  throw new Error("Unexpected dependency call");
}

function createImplementation() {
  return new Spreadsheet("spreadsheet-id", unexpected);
}

describe("createSpreadsheetObjectFacade", () => {
  test("creates a Spreadsheet facade in the supplied VM realm", () => {
    const context = vm.createContext({});

    const createObject = createVmGasObjectFactory(context);

    const spreadsheet = createSpreadsheetObjectFacade(createImplementation(), {
      createObject,
    });

    context.spreadsheet = spreadsheet;

    expect(
      vm.runInContext("Object.getPrototypeOf(spreadsheet) === Object.prototype", context),
    ).toBe(true);

    expect(vm.runInContext("spreadsheet.constructor === Object", context)).toBe(true);

    expect(Object.prototype.toString.call(spreadsheet)).toBe("[object Object]");
  });

  test("creates the characterized Spreadsheet own method surface", () => {
    const spreadsheet = createSpreadsheetObjectFacade(createImplementation());

    const expectedNames = [...SPREADSHEET_GAS_METHOD_NAMES, "toString"];

    expect(Object.getOwnPropertyNames(spreadsheet).sort()).toEqual(expectedNames.sort());

    expect(expectedNames).toHaveLength(146);

    for (const name of expectedNames) {
      expect(Object.getOwnPropertyDescriptor(spreadsheet, name)).toMatchObject({
        configurable: true,
        enumerable: true,
        writable: true,
      });

      expect(typeof (spreadsheet as unknown as Record<string, unknown>)[name]).toBe("function");
    }

    expect(String(spreadsheet as any)).toBe("Spreadsheet");
  });

  test("delegates implemented Spreadsheet methods", () => {
    const spreadsheet = createSpreadsheetObjectFacade(createImplementation());

    expect(spreadsheet.getId()).toBe("spreadsheet-id");
  });

  test("does not expose the internal receiver from delegated methods", () => {
    const implementation = createImplementation();

    (implementation as any).rename = () => implementation;

    const spreadsheet = createSpreadsheetObjectFacade(implementation);

    expect((spreadsheet as any).rename("renamed")).toBe(spreadsheet);
  });
});

test("returns fresh Sheet facades from getSheetById", () => {
  const createSheet = () =>
    new Sheet(
      "spreadsheet-id",
      0,
      () => {
        throw new Error("Unexpected Range acquisition");
      },
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
    );

  const spreadsheet = createSpreadsheetObjectFacade(new Spreadsheet("spreadsheet-id", createSheet));

  const sheetA = spreadsheet.getSheetById(0);

  const sheetB = spreadsheet.getSheetById(0);

  expect(sheetA).not.toBe(sheetB);

  expect(Object.getPrototypeOf(sheetA)).toBe(Object.prototype);

  expect(String(sheetA as any)).toBe("Sheet");

  expect(sheetA?.getSheetId()).toBe(0);
});
