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

test("deleteRows uses GAS 1-based row positions", () => {
  const cells = [["r1"], ["r2"], ["r3"], ["r4"], ["r5"]];

  const context = createContext(cells);
  const handler = new SheetHandler();

  handler.deleteRows(context, {
    spreadsheetId: "spreadsheet-id",
    sheetId: 123,
    rowPosition: 2,
    howMany: 2,
  });

  expect(cells).toEqual([["r1"], ["r4"], ["r5"]]);
});

test("deleteColumns uses GAS 1-based column positions", () => {
  const cells = [
    ["r1c1", "r1c2", "r1c3", "r1c4", "r1c5"],
    ["r2c1", "r2c2", "r2c3", "r2c4", "r2c5"],
  ];

  const context = createContext(cells);
  const handler = new SheetHandler();

  handler.deleteColumns(context, {
    spreadsheetId: "spreadsheet-id",
    sheetId: 123,
    columnPosition: 2,
    howMany: 2,
  });

  expect(cells).toEqual([
    ["r1c1", "r1c4", "r1c5"],
    ["r2c1", "r2c4", "r2c5"],
  ]);
});
