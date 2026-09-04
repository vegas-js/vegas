import { expect, test } from "vitest";

import type { SpreadsheetStore } from "./range";
import { SpreadsheetAppHandler } from "./spreadsheetApp";

test("creates the GAS-compatible initial sheet", () => {
  const store: SpreadsheetStore = new Map();
  const handler = new SpreadsheetAppHandler(store);

  const spreadsheetId = handler.create({
    name: "Book",
    rows: 7,
    columns: 9,
  });

  const spreadsheet = store.get(spreadsheetId);

  expect(spreadsheet?.name).toBe("Book");
  expect(spreadsheet?.sheets.size).toBe(1);

  const sheet = spreadsheet?.sheets.get(0);

  expect(sheet?.name).toBe("Sheet1");
  expect(sheet?.cells).toHaveLength(7);
  expect(sheet?.cells.every((row) => row.length === 9)).toBe(true);
});
