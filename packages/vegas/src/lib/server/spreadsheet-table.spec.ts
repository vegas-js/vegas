import { describe, expect, expectTypeOf, test, vi } from "vitest";

import {
  createSpreadsheetRowCodec,
  createSpreadsheetTable,
  type SpreadsheetTable,
} from "../server";

interface UserRow {
  readonly id: number;
  readonly name: string;
}

function createSheet(values: unknown[][], lastRow = values.length) {
  const getValues = vi.fn(() => values);
  const getRange = vi.fn(() => ({ getValues }));
  const getLastRow = vi.fn(() => lastRow);
  const sheet = {
    getLastRow,
    getRange,
  } as unknown as GoogleAppsScript.Spreadsheet.Sheet;

  return {
    sheet,
    getLastRow,
    getRange,
    getValues,
  };
}

describe("createSpreadsheetTable", () => {
  test("read and decode all rows", () => {
    const source = createSheet([
      [1, "Ada"],
      [2, "Grace"],
    ]);
    const codec = createSpreadsheetRowCodec<UserRow>(
      2,
      (values) => ({
        id: Number(values[0]),
        name: String(values[1]),
      }),
      (row) => [row.id, row.name],
    );
    const table = createSpreadsheetTable(source.sheet, codec);

    expectTypeOf(table).toEqualTypeOf<SpreadsheetTable<UserRow>>();
    expect(table.readAll()).toStrictEqual([
      { id: 1, name: "Ada" },
      { id: 2, name: "Grace" },
    ]);
    expect(source.getLastRow).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledOnce();
    expect(source.getRange).toHaveBeenCalledWith(1, 1, 2, 2);
    expect(source.getValues).toHaveBeenCalledOnce();
  });

  test("read from a configured table origin", () => {
    const source = createSheet(
      [
        [1, "Ada"],
        [2, "Grace"],
      ],
      3,
    );
    const codec = createSpreadsheetRowCodec(
      2,
      (values) => values,
      (values) => values,
    );
    const table = createSpreadsheetTable(source.sheet, codec, {
      startRow: 2,
      startColumn: 3,
    });

    expect(table.readAll()).toStrictEqual([
      [1, "Ada"],
      [2, "Grace"],
    ]);
    expect(source.getRange).toHaveBeenCalledWith(2, 3, 2, 2);
  });

  test("return no rows without requesting a range when the table is empty", () => {
    const source = createSheet([], 1);
    const codec = createSpreadsheetRowCodec(
      2,
      (values) => values,
      (values) => values,
    );
    const table = createSpreadsheetTable(source.sheet, codec, {
      startRow: 2,
    });

    expect(table.readAll()).toStrictEqual([]);
    expect(source.getLastRow).toHaveBeenCalledOnce();
    expect(source.getRange).not.toHaveBeenCalled();
    expect(source.getValues).not.toHaveBeenCalled();
  });

  test.each([
    ["startRow", 0],
    ["startRow", -1],
    ["startRow", 1.5],
    ["startColumn", 0],
    ["startColumn", -1],
    ["startColumn", 1.5],
  ] as const)("reject invalid %s: %s", (name, value) => {
    const source = createSheet([]);
    const codec = createSpreadsheetRowCodec(
      1,
      (values) => values,
      (values) => values,
    );

    expect(() =>
      createSpreadsheetTable(source.sheet, codec, {
        [name]: value,
      }),
    ).toThrow(`Spreadsheet table ${name} must be a positive integer.`);
  });
});
