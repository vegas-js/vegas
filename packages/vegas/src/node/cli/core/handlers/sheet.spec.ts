import { expect, test } from "vitest";

import { ServeContext } from "../context";
import { SheetHandler } from "./sheet";

function createContext(cells: any[][]) {
  return {
    store: {
      spreadsheet: new Map([
        [
          "spreadsheet-id",
          {
            name: "Book",
            sheets: new Map([
              [
                123,
                {
                  name: "Sheet1",
                  cells,
                },
              ],
            ]),
          },
        ],
      ]),
    },
  } as ServeContext;
}

test("last/max row/column", () => {
  const cells = [
    ["", "B1", ""],
    ["", "", ""],
    ["A3", "", ""],
    ["", "", ""],
  ];
  const context = createContext(cells);
  const handler = new SheetHandler();
  const payload = {
    spreadsheetId: "spreadsheet-id",
    sheetId: 123,
  };

  expect(handler.getLastRow(context, payload)).toBe(3);
  expect(handler.getLastColumn(context, payload)).toBe(2);
  expect(handler.getMaxRows(context, payload)).toBe(4);
  expect(handler.getMaxColumns(context, payload)).toBe(3);
  expect(handler.getSheetName(context, payload)).toBe("Sheet1");
});

test("sheet name/id resolution", () => {
  const cells = [
    ["", "B1", ""],
    ["", "", ""],
    ["A3", "", ""],
    ["", "", ""],
  ];
  const context = createContext(cells);
  const handler = new SheetHandler();

  expect(
    handler.getRange(context, {
      spreadsheetId: "spreadsheet-id",
      sheetName: "Sheet1",
    }),
  ).toBe(123);
});

test("clearContents", () => {
  const cells = [
    ["", "B1", ""],
    ["", "", ""],
    ["A3", "", ""],
    ["", "", ""],
  ];
  const context = createContext(cells);
  const handler = new SheetHandler();
  const payload = {
    spreadsheetId: "spreadsheet-id",
    sheetId: 123,
  };
  handler.clearContents(context, payload);

  expect(cells).toEqual([
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ]);
});
