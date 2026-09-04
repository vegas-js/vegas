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

test("openById validates spreadsheet existence", () => {
  const store: SpreadsheetStore = new Map();

  store.set("spreadsheet-id", {
    name: "Book",
    sheets: new Map(),
  });

  const handler = new SpreadsheetAppHandler(store);

  expect(
    handler.openById({
      id: "spreadsheet-id",
    }),
  ).toBe("spreadsheet-id");

  let thrown: unknown;

  try {
    handler.openById({
      id: "missing-id",
    });
  } catch (error) {
    thrown = error;
  }

  expect((thrown as Error).name).toBe("Exception");

  expect((thrown as Error).message).toBe("Illegal spreadsheet id or key: missing-id");
});
