import { expect, test, vi } from "vitest";

import { Sheet } from "./Sheet";

test("specifying a numeric value", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const sheet = new Sheet("spreadsheet-id", 123, createRange, requestSync);
  const result = sheet.getRange(2, 3, 4, 5);

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 2, 3, 4, 5);
  expect(result).toBe(range);
});

test("single cell A1 notation", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const sheet = new Sheet("spreadsheet-id", 123, createRange, requestSync);
  sheet.getRange("C4");

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 4, 3, 1, 1);
});

test("rectangle A1 notation", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const sheet = new Sheet("spreadsheet-id", 123, createRange, requestSync);
  sheet.getRange("B3:D5");

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 3, 2, 3, 3);
});

test("named sheet A1 notation", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const sheet = new Sheet("spreadsheet-id", 123, createRange, requestSync);
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
  const sheet = new Sheet("spreadsheet-id", 123, createRange, requestSync);
  const result = sheet.getSheetValues(2, 3, 4, 5);

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 2, 3, 4, 5);
  expect(range.getValues).toHaveBeenCalled();
  expect(result).toEqual([["value"]]);
});
