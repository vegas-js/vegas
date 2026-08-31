import { describe, expect, test, vi } from "vitest";

import type { RuntimeServicePort } from "../../../runtime/protocol";
import { Sheet } from "./Sheet";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

test("specifying a numeric value", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };
  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, requestSync);
  const result = sheet.getRange(2, 3, 4, 5);

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 2, 3, 4, 5);
  expect(result).toBe(range);
});

test("single cell A1 notation", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };
  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, requestSync);
  sheet.getRange("C4");

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 4, 3, 1, 1);
});

test("rectangle A1 notation", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };
  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, requestSync);
  sheet.getRange("B3:D5");

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 3, 2, 3, 3);
});

test("named sheet A1 notation", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };
  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, requestSync);
  requestSync.mockReturnValue(456);
  sheet.getRange("Other!A1:B2");

  expect(requestSync).toHaveBeenCalledWith({
    message: "Sheet#getRange",
    payload: {
      spreadsheetId: "spreadsheet-id",
      sheetName: "Other",
    },
  });
  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 456, 1, 1, 2, 2);
});

test("range delegation in getSheetValues", () => {
  const range = {
    getValues: vi.fn(() => [["value"]]),
  };
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };
  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, requestSync);
  const result = sheet.getSheetValues(2, 3, 4, 5);

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 2, 3, 4, 5);
  expect(range.getValues).toHaveBeenCalled();
  expect(result).toEqual([["value"]]);
});

test("clearContents", () => {
  const requestSync = vi.fn();
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };
  const sheet = new Sheet("spreadsheet-id", 123, vi.fn(), service, requestSync);
  const result = sheet.clearContents();

  expect(requestSync).toHaveBeenCalledWith({
    message: "Sheet#clearContents",
    payload: {
      spreadsheetId: "spreadsheet-id",
      sheetId: 123,
    },
  });
  expect(result).toBe(sheet);
});

describe("row deletion", () => {
  test("deleteRow", () => {
    const requestSync = vi.fn();
    const service: RuntimeServicePort<"Sheet"> = {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    };
    const sheet = new Sheet("spreadsheet-id", 123, vi.fn(), service, requestSync);
    const result = sheet.deleteRow(4);

    expect(requestSync).toHaveBeenCalledWith({
      message: "Sheet#deleteRow",
      payload: {
        spreadsheetId: "spreadsheet-id",
        sheetId: 123,
        rowPosition: 4,
      },
    });
    expect(result).toBe(sheet);
  });

  test("deleteRows", () => {
    const requestSync = vi.fn();
    const service: RuntimeServicePort<"Sheet"> = {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    };
    const sheet = new Sheet("spreadsheet-id", 123, vi.fn(), service, requestSync);
    const result = sheet.deleteRows(4, 3);

    expect(requestSync).toHaveBeenCalledWith({
      message: "Sheet#deleteRows",
      payload: {
        spreadsheetId: "spreadsheet-id",
        sheetId: 123,
        rowPosition: 4,
        howMany: 3,
      },
    });
    expect(result).toBe(sheet);
  });
});

describe("column deletion", () => {
  test("deleteColumn", () => {
    const requestSync = vi.fn();
    const service: RuntimeServicePort<"Sheet"> = {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    };
    const sheet = new Sheet("spreadsheet-id", 123, vi.fn(), service, requestSync);
    const result = sheet.deleteColumn(5);

    expect(requestSync).toHaveBeenCalledWith({
      message: "Sheet#deleteColumn",
      payload: {
        spreadsheetId: "spreadsheet-id",
        sheetId: 123,
        columnPosition: 5,
      },
    });
    expect(result).toBe(sheet);
  });

  test("deleteColumns", () => {
    const requestSync = vi.fn();
    const service: RuntimeServicePort<"Sheet"> = {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    };
    const sheet = new Sheet("spreadsheet-id", 123, vi.fn(), service, requestSync);
    const result = sheet.deleteColumns(5, 2);

    expect(requestSync).toHaveBeenCalledWith({
      message: "Sheet#deleteColumns",
      payload: {
        spreadsheetId: "spreadsheet-id",
        sheetId: 123,
        columnPosition: 5,
        howMany: 2,
      },
    });
    expect(result).toBe(sheet);
  });
});

test.each([
  ["getLastRow", 10],
  ["getLastColumn", 5],
  ["getMaxRows", 1000],
  ["getMaxColumns", 26],
  ["getSheetName", "Sheet1"],
])("query", (target, value) => {
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(() => 10),
    getLastColumn: vi.fn(() => 5),
    getMaxRows: vi.fn(() => 1000),
    getMaxColumns: vi.fn(() => 26),
    getSheetName: vi.fn(() => "Sheet1"),
  };
  const sheet = new Sheet("spreadsheet-id", 123, vi.fn(), service, unexpected);
  const result = (sheet as any)[target]();

  expect(result).toBe(value);
  expect((service as any)[target]).toHaveBeenCalledWith({
    spreadsheetId: "spreadsheet-id",
    sheetId: 123,
  });
});
