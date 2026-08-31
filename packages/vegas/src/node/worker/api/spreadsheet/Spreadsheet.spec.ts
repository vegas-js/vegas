import { expect, test, vi } from "vitest";

import { Spreadsheet } from "./Spreadsheet";

test("getId", () => {
  const spreadsheet = new Spreadsheet("spreadsheet-id", vi.fn(), vi.fn());

  expect(spreadsheet.getId()).toBe("spreadsheet-id");
});

test("getSheetById", () => {
  const sheet = {};
  const createSheet = vi.fn(() => sheet as any);
  const requestSync = vi.fn(() => true);
  const spreadsheet = new Spreadsheet("spreadsheet-id", createSheet, requestSync);
  const result = spreadsheet.getSheetById(123);

  expect(createSheet).toHaveBeenCalledWith("spreadsheet-id", 123);
  expect(result).toBe(sheet);
});
