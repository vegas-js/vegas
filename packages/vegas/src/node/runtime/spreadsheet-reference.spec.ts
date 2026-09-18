import { describe, expect, test } from "vitest";

import type {
  RangeReference,
  SheetReference,
  SpreadsheetObjectReference,
  SpreadsheetReference,
} from "./index";

describe("Spreadsheet object references", () => {
  test("represent Spreadsheet, Sheet, and Range identity as plain host data", () => {
    const spreadsheet = {
      service: "spreadsheet",
      kind: "spreadsheet",
      id: "spreadsheet-id",
    } satisfies SpreadsheetReference;
    const sheet = {
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-id",
      sheetId: 42,
    } satisfies SheetReference;
    const range = {
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: "spreadsheet-id",
      sheetId: 42,
      row: 2,
      column: 3,
      numRows: 4,
      numColumns: 5,
    } satisfies RangeReference;

    expect(spreadsheet).toStrictEqual({
      service: "spreadsheet",
      kind: "spreadsheet",
      id: "spreadsheet-id",
    });
    expect(sheet).toStrictEqual({
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId: "spreadsheet-id",
      sheetId: 42,
    });
    expect(range).toStrictEqual({
      service: "spreadsheet",
      kind: "range",
      spreadsheetId: "spreadsheet-id",
      sheetId: 42,
      row: 2,
      column: 3,
      numRows: 4,
      numColumns: 5,
    });
  });

  test("keep references serializable across the host boundary", () => {
    const references = [
      {
        service: "spreadsheet",
        kind: "spreadsheet",
        id: "spreadsheet-id",
      },
      {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: "spreadsheet-id",
        sheetId: 42,
      },
      {
        service: "spreadsheet",
        kind: "range",
        spreadsheetId: "spreadsheet-id",
        sheetId: 42,
        row: 1,
        column: 1,
        numRows: 2,
        numColumns: 3,
      },
    ] satisfies SpreadsheetObjectReference[];

    expect(JSON.parse(JSON.stringify(references))).toStrictEqual(references);
  });
});
