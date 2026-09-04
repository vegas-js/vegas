import { describe, expect, test, vi } from "vitest";

import type { RuntimeServicePort } from "../../protocol";
import { Sheet } from "./Sheet";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

test("specifying a numeric value", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };
  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, requestSync);
  const result = sheet.getRange(2, 3, 4, 5);

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 2, 3, 4, 5);
  expect(result).toBe(range);
});

test("single cell A1 notation", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };
  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, requestSync);
  sheet.getRange("C4");

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 4, 3, 1, 1);
});

test("rectangle A1 notation", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };
  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, requestSync);
  sheet.getRange("B3:D5");

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 3, 2, 3, 3);
});

test("named sheet A1 notation", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };
  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, requestSync);
  requestSync.mockReturnValue(456);
  sheet.getRange("Other!A1:B2");

  expect(requestSync).toHaveBeenCalledWith({
    message: "Sheet#getRange",
    payload: {
      spreadsheetId: "spreadsheet-id",
      sheetName: "Other",
    },
  });
  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 456, 1, 1, 2, 2);
});

test("range delegation in getSheetValues", () => {
  const range = {
    getValues: vi.fn(() => [["value"]]),
  };
  const createRange = vi.fn(() => range as any);
  const requestSync = vi.fn();
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };
  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, requestSync);
  const result = sheet.getSheetValues(2, 3, 4, 5);

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 2, 3, 4, 5);
  expect(range.getValues).toHaveBeenCalled();
  expect(result).toEqual([["value"]]);
});

test("resolves -1 row count in getSheetValues from the last row", () => {
  const range = {
    getValues: vi.fn(() => [
      ["b2", "c2", "d2"],
      ["b3", "c3", "d3"],
      ["b4", "c4", "d4"],
    ]),
  };

  const createRange = vi.fn(() => range as any);

  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(() => 4),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };

  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, vi.fn());

  const result = sheet.getSheetValues(2, 2, -1, 3);

  expect(service.getLastRow).toHaveBeenCalledWith({
    spreadsheetId: "spreadsheet-id",
    sheetId: 123,
  });

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 2, 2, 3, 3);

  expect(result).toEqual([
    ["b2", "c2", "d2"],
    ["b3", "c3", "d3"],
    ["b4", "c4", "d4"],
  ]);
});

test("resolves -1 column count in getSheetValues from the last column", () => {
  const range = {
    getValues: vi.fn(() => [
      ["b2", "c2", "d2"],
      ["b3", "c3", "d3"],
      ["b4", "c4", "d4"],
    ]),
  };

  const createRange = vi.fn(() => range as any);

  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(() => 4),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };

  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, vi.fn());

  const result = sheet.getSheetValues(2, 2, 3, -1);

  expect(service.getLastColumn).toHaveBeenCalledWith({
    spreadsheetId: "spreadsheet-id",
    sheetId: 123,
  });

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 2, 2, 3, 3);

  expect(result).toEqual([
    ["b2", "c2", "d2"],
    ["b3", "c3", "d3"],
    ["b4", "c4", "d4"],
  ]);
});

test("rejects zero start row in getSheetValues with a GAS Exception", () => {
  const sheet = new Sheet(
    "spreadsheet-id",
    123,
    vi.fn(),
    {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    },
    vi.fn(),
  );

  try {
    sheet.getSheetValues(0, 1, 1, 1);
    throw new Error("Expected getSheetValues to throw");
  } catch (error) {
    expect((error as Error).name).toBe("Exception");
    expect((error as Error).message).toBe("The starting row of the range is too small.");
  }
});

test("rejects zero row count in getSheetValues with a GAS Exception", () => {
  const sheet = new Sheet(
    "spreadsheet-id",
    123,
    vi.fn(),
    {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    },
    vi.fn(),
  );

  try {
    sheet.getSheetValues(1, 1, 0, 1);
    throw new Error("Expected getSheetValues to throw");
  } catch (error) {
    expect((error as Error).name).toBe("Exception");
    expect((error as Error).message).toBe("The number of rows in the range must be at least 1.");
  }
});

test("clearContents", () => {
  const requestSync = vi.fn();
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };
  const sheet = new Sheet("spreadsheet-id", 123, vi.fn(), service, requestSync);
  const result = sheet.clearContents();

  expect(requestSync).toHaveBeenCalledWith({
    message: "Sheet#clearContents",
    payload: {
      spreadsheetId: "spreadsheet-id",
      sheetId: 123,
    },
  });
  expect(result).not.toBe(sheet);
  expect(result).toBeInstanceOf(Sheet);
  expect(result.getSheetId()).toBe(123);
});

describe("row deletion", () => {
  test("deleteRow", () => {
    const requestSync = vi.fn();
    const service: RuntimeServicePort<"Sheet"> = {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    };
    const sheet = new Sheet("spreadsheet-id", 123, vi.fn(), service, requestSync);
    const result = sheet.deleteRow(4);

    expect(requestSync).toHaveBeenCalledWith({
      message: "Sheet#deleteRow",
      payload: {
        spreadsheetId: "spreadsheet-id",
        sheetId: 123,
        rowPosition: 4,
      },
    });
    expect(result).not.toBe(sheet);
    expect(result).toBeInstanceOf(Sheet);
    expect(result.getSheetId()).toBe(123);
  });

  test("deleteRows", () => {
    const requestSync = vi.fn();
    const service: RuntimeServicePort<"Sheet"> = {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    };
    const sheet = new Sheet("spreadsheet-id", 123, vi.fn(), service, requestSync);
    const result = sheet.deleteRows(4, 3);

    expect(requestSync).toHaveBeenCalledWith({
      message: "Sheet#deleteRows",
      payload: {
        spreadsheetId: "spreadsheet-id",
        sheetId: 123,
        rowPosition: 4,
        howMany: 3,
      },
    });
    expect(result).toBeNull();
  });
});

describe("column deletion", () => {
  test("deleteColumn", () => {
    const requestSync = vi.fn();
    const service: RuntimeServicePort<"Sheet"> = {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    };
    const sheet = new Sheet("spreadsheet-id", 123, vi.fn(), service, requestSync);
    const result = sheet.deleteColumn(5);

    expect(requestSync).toHaveBeenCalledWith({
      message: "Sheet#deleteColumn",
      payload: {
        spreadsheetId: "spreadsheet-id",
        sheetId: 123,
        columnPosition: 5,
      },
    });
    expect(result).not.toBe(sheet);
    expect(result).toBeInstanceOf(Sheet);
    expect(result.getSheetId()).toBe(123);
  });

  test("deleteColumns", () => {
    const requestSync = vi.fn();
    const service: RuntimeServicePort<"Sheet"> = {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    };
    const sheet = new Sheet("spreadsheet-id", 123, vi.fn(), service, requestSync);
    const result = sheet.deleteColumns(5, 2);

    expect(requestSync).toHaveBeenCalledWith({
      message: "Sheet#deleteColumns",
      payload: {
        spreadsheetId: "spreadsheet-id",
        sheetId: 123,
        columnPosition: 5,
        howMany: 2,
      },
    });
    expect(result).toBeNull();
  });
});

test.each([
  ["getLastRow", 10],
  ["getLastColumn", 5],
  ["getMaxRows", 1000],
  ["getMaxColumns", 26],
  ["getSheetName", "Sheet1"],
])("query", (target, value) => {
  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(() => 10),
    getLastColumn: vi.fn(() => 5),
    getMaxRows: vi.fn(() => 1000),
    getMaxColumns: vi.fn(() => 26),
    getSheetName: vi.fn(() => "Sheet1"),
  };
  const sheet = new Sheet("spreadsheet-id", 123, vi.fn(), service, unexpected);
  const result = (sheet as any)[target]();

  expect(result).toBe(value);
  expect((service as any)[target]).toHaveBeenCalledWith({
    spreadsheetId: "spreadsheet-id",
    sheetId: 123,
  });
});

test("expands whole-column A1 notation to the sheet row count", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);

  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(() => 6),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };

  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, vi.fn());

  sheet.getRange("B:B");

  expect(service.getMaxRows).toHaveBeenCalledWith({
    spreadsheetId: "spreadsheet-id",
    sheetId: 123,
  });

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 1, 2, 6, 1);
});

test("expands whole-row A1 notation to the sheet column count", () => {
  const range = {};
  const createRange = vi.fn(() => range as any);

  const service: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(() => 7),
    getSheetName: vi.fn(),
  };

  const sheet = new Sheet("spreadsheet-id", 123, createRange, service, vi.fn());

  sheet.getRange("2:2");

  expect(service.getMaxColumns).toHaveBeenCalledWith({
    spreadsheetId: "spreadsheet-id",
    sheetId: 123,
  });

  expect(createRange).toHaveBeenCalledWith("spreadsheet-id", 123, 2, 1, 1, 7);
});

test("rejects a starting row below 1 with a GAS Exception", () => {
  const sheet = new Sheet(
    "spreadsheet-id",
    123,
    vi.fn(),
    {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    },
    vi.fn(),
  );

  try {
    sheet.getRange(0, 1);
    throw new Error("Expected getRange to throw");
  } catch (error) {
    expect((error as Error).name).toBe("Exception");
    expect((error as Error).message).toBe("The starting row of the range is too small.");
  }
});

test("rejects a starting column below 1 with a GAS Exception", () => {
  const sheet = new Sheet(
    "spreadsheet-id",
    123,
    vi.fn(),
    {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    },
    vi.fn(),
  );

  try {
    sheet.getRange(1, 0);
    throw new Error("Expected getRange to throw");
  } catch (error) {
    expect((error as Error).name).toBe("Exception");
    expect((error as Error).message).toBe("The starting column of the range is too small.");
  }
});

test("rejects a row count below 1 with a GAS Exception", () => {
  const sheet = new Sheet(
    "spreadsheet-id",
    123,
    vi.fn(),
    {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    },
    vi.fn(),
  );

  try {
    sheet.getRange(1, 1, 0, 1);
    throw new Error("Expected getRange to throw");
  } catch (error) {
    expect((error as Error).name).toBe("Exception");
    expect((error as Error).message).toBe("The number of rows in the range must be at least 1.");
  }
});

test("rejects a column count below 1 with a GAS Exception", () => {
  const sheet = new Sheet(
    "spreadsheet-id",
    123,
    vi.fn(),
    {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    },
    vi.fn(),
  );

  try {
    sheet.getRange(1, 1, 1, 0);
    throw new Error("Expected getRange to throw");
  } catch (error) {
    expect((error as Error).name).toBe("Exception");
    expect((error as Error).message).toBe("The number of columns in the range must be at least 1.");
  }
});

test("rejects invalid A1 notation with a GAS Exception", () => {
  const sheet = new Sheet(
    "spreadsheet-id",
    123,
    vi.fn(),
    {
      getLastRow: vi.fn(),
      getLastColumn: vi.fn(),
      getMaxRows: vi.fn(),
      getMaxColumns: vi.fn(),
      getSheetName: vi.fn(),
    },
    vi.fn(),
  );

  try {
    sheet.getRange("not-a-range");
    throw new Error("Expected getRange to throw");
  } catch (error) {
    expect((error as Error).name).toBe("Exception");
    expect((error as Error).message).toBe("Range not found");
  }
});
