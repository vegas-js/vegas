import { expect, test } from "vitest";

import type { ServeContext } from "../context";
import { RangeHandler } from "./range";

function createContext(): ServeContext {
  return {
    store: {
      spreadsheet: new Map([
        [
          "spreadsheet-1",
          {
            name: "Spreadsheet 1",
            sheets: new Map([
              [
                1,
                {
                  name: "Sheet1",
                  cells: [
                    ["A1", "B1", "C1"],
                    ["A2", "B2", "C2"],
                    ["A3", "B3", "C3"],
                  ],
                },
              ],
            ]),
          },
        ],
      ]),
    },
  } as unknown as ServeContext;
}

test("gets a value from the specified cell", () => {
  const handler = new RangeHandler(createContext());

  expect(
    handler.getValue({
      spreadsheetId: "spreadsheet-1",
      sheetId: 1,
      range: { row: 2, column: 2 },
    }),
  ).toBe("B2");
});

test("gets values from the specified range", () => {
  const handler = new RangeHandler(createContext());

  expect(
    handler.getValues({
      spreadsheetId: "spreadsheet-1",
      sheetId: 1,
      range: { row: 2, column: 2, numRows: 2, numColumns: 2 },
    }),
  ).toEqual([
    ["B2", "C2"],
    ["B3", "C3"],
  ]);
});

test("sets the same value to the specified range", () => {
  const context = createContext();
  const handler = new RangeHandler(context);
  handler.setValue({
    spreadsheetId: "spreadsheet-1",
    sheetId: 1,
    range: { row: 1, column: 2, numRows: 2, numColumns: 2 },
    value: "X",
  });

  expect(context.store.spreadsheet.get("spreadsheet-1")!.sheets.get(1)!.cells).toEqual([
    ["A1", "X", "X"],
    ["A2", "X", "X"],
    ["A3", "B3", "C3"],
  ]);
});

test("sets values to the specified range", () => {
  const context = createContext();
  const handler = new RangeHandler(context);
  handler.setValues({
    spreadsheetId: "spreadsheet-1",
    sheetId: 1,
    range: { row: 2, column: 2, numRows: 2, numColumns: 2 },
    values: [
      ["X1", "Y1"],
      ["X2", "Y2"],
    ],
  });

  expect(context.store.spreadsheet.get("spreadsheet-1")!.sheets.get(1)!.cells).toEqual([
    ["A1", "B1", "C1"],
    ["A2", "X1", "Y1"],
    ["A3", "X2", "Y2"],
  ]);
});

test("throws when spreadsheet does not exist", () => {
  const handler = new RangeHandler(createContext());

  expect(() =>
    handler.getValue({
      spreadsheetId: "missing",
      sheetId: 1,
      range: { row: 1, column: 1 },
    }),
  ).toThrow("Spreadsheet not found: missing");
});

test("throws when sheet does not exist", () => {
  const handler = new RangeHandler(createContext());

  expect(() =>
    handler.getValue({
      spreadsheetId: "spreadsheet-1",
      sheetId: 999,
      range: { row: 1, column: 1 },
    }),
  ).toThrow("Sheet not found: 999");
});
