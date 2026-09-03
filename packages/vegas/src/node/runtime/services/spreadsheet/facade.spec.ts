import { expect, test, vi } from "vitest";

import { createSpreadsheetApp } from "./facade";

test("creates GAS-compatible SpreadsheetApp facade", () => {
  const spreadsheet = {};
  const createSpreadsheet = vi.fn(() => spreadsheet as any);
  const create = vi.fn(() => "spreadsheet-id");

  const spreadsheetApp = createSpreadsheetApp(createSpreadsheet, { create }) as any;

  expect(Object.getPrototypeOf(spreadsheetApp)).toBe(Object.prototype);
  expect(String(spreadsheetApp)).toBe("SpreadsheetApp");

  expect(Object.getOwnPropertyDescriptor(spreadsheetApp, "ChartAggregationType")?.writable).toBe(
    false,
  );

  expect(typeof spreadsheetApp.enableLookerExecution).toBe("function");
  expect(typeof spreadsheetApp.openByKey).toBe("function");

  expect(spreadsheetApp.AutoFillSeries).toBe(spreadsheetApp.AutoFillSeries.DEFAULT_SERIES);

  expect(spreadsheetApp.BooleanCriteria).toBe(spreadsheetApp.BooleanCriteria.NUMBER_BETWEEN);
  expect(spreadsheetApp.BooleanCriteria.NUMBER_BETWEEN.ordinal()).toBe(9);

  expect(spreadsheetApp.ChartAggregationType).toBe(spreadsheetApp.ChartAggregationType.UNSUPPORTED);

  expect(spreadsheetApp.DataValidationCriteria.DATE_AFTER_RELATIVE.ordinal()).toBe(25);

  expect(spreadsheetApp.GroupControlTogglePosition).toBe(
    spreadsheetApp.GroupControlTogglePosition.AFTER,
  );

  expect(spreadsheetApp.SortOrder).toBe(spreadsheetApp.SortOrder.ASCENDING);

  const result = spreadsheetApp.create("Test", 10, 5);

  expect(create).toHaveBeenCalledWith({
    name: "Test",
    rows: 10,
    columns: 5,
  });
  expect(createSpreadsheet).toHaveBeenCalledWith("spreadsheet-id");
  expect(result).toBe(spreadsheet);
});
