import { expect, test } from "vitest";

import { SheetHandler } from "./sheet";

test("last/max row/column", () => {
  const store = new Map();
  const handler = new SheetHandler(store);
  store.set("spreadsheet-id", {
    name: "Book",
    sheets: new Map([
      [
        123,
        {
          name: "Sheet1",
          cells: [
            ["", "B1", ""],
            ["", "", ""],
            ["A3", "", ""],
            ["", "", ""],
          ],
        },
      ],
    ]),
  });
  const payload = {
    spreadsheetId: "spreadsheet-id",
    sheetId: 123,
  };

  expect(handler.getLastRow(payload)).toBe(3);
  expect(handler.getLastColumn(payload)).toBe(2);
  expect(handler.getMaxRows(payload)).toBe(4);
  expect(handler.getMaxColumns(payload)).toBe(3);
  expect(handler.getSheetName(payload)).toBe("Sheet1");
});
