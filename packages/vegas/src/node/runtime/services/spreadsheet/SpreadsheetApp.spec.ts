import { expect, test, vi } from "vitest";

import { SpreadsheetApp } from "./SpreadsheetApp";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

test("create default", () => {
  const spreadsheet = {};
  const createSpreadsheet = vi.fn(() => spreadsheet as any);
  const create = vi.fn(() => "spreadsheet-id");
  const app = new SpreadsheetApp(createSpreadsheet, { create, openById: unexpected });
  const result = app.create("Test");

  expect(create).toHaveBeenCalledWith({
    name: "Test",
    rows: 1000,
    columns: 26,
  });
  expect(createSpreadsheet).toHaveBeenCalledWith("spreadsheet-id");
  expect(result).toBe(spreadsheet);
});

test("create explicit size", () => {
  const spreadsheet = {};
  const createSpreadsheet = vi.fn(() => spreadsheet as any);
  const create = vi.fn(() => "spreadsheet-id");
  const app = new SpreadsheetApp(createSpreadsheet, { create, openById: unexpected });
  const result = app.create("Test", 10, 5);

  expect(create).toHaveBeenCalledWith({
    name: "Test",
    rows: 10,
    columns: 5,
  });
  expect(createSpreadsheet).toHaveBeenCalledWith("spreadsheet-id");
  expect(result).toBe(spreadsheet);
});

test("openById validates and creates a Spreadsheet", () => {
  const spreadsheet = {};

  const createSpreadsheet = vi.fn(() => spreadsheet as any);

  const openById = vi.fn(({ id }: { id: string }) => id);

  const app = new SpreadsheetApp(createSpreadsheet, {
    create: unexpected,
    openById,
  });

  const result = app.openById("spreadsheet-id");

  expect(openById).toHaveBeenCalledWith({
    id: "spreadsheet-id",
  });

  expect(createSpreadsheet).toHaveBeenCalledWith("spreadsheet-id");

  expect(result).toBe(spreadsheet);
});

test("open() rejects plain file-like objects before calling getId()", () => {
  const createSpreadsheet = vi.fn();

  const getId = vi.fn(() => "spreadsheet-id");

  const app = new SpreadsheetApp(createSpreadsheet, {
    create: unexpected,
    openById: unexpected,
  });

  let thrown: unknown;

  try {
    app.open({
      getId,
    } as unknown as GoogleAppsScript.Drive.File);
  } catch (error) {
    thrown = error;
  }

  expect(getId).not.toHaveBeenCalled();

  expect((thrown as Error).name).toBe("Exception");

  expect((thrown as Error).message).toBe(
    "The parameters ((class)) don't match the method signature for SpreadsheetApp.open.",
  );
});

test("openByUrl validates the extracted spreadsheet id", () => {
  const spreadsheet = {};

  const createSpreadsheet = vi.fn(() => spreadsheet as any);

  const openById = vi.fn(({ id }: { id: string }) => id);

  const app = new SpreadsheetApp(createSpreadsheet, {
    create: unexpected,
    openById,
  });

  const result = app.openByUrl("https://docs.google.com/spreadsheets/d/abc123/edit#gid=0");

  expect(openById).toHaveBeenCalledWith({
    id: "abc123",
  });

  expect(createSpreadsheet).toHaveBeenCalledWith("abc123");

  expect(result).toBe(spreadsheet);
});

test("preserves characterized SpreadsheetApp open validation errors", () => {
  const app = new SpreadsheetApp(vi.fn(), {
    create: unexpected,
    openById: unexpected,
  });

  const cases = [
    {
      call: () => Reflect.apply(app.openById, app, []),

      message: "The parameters () don't match the method signature for SpreadsheetApp.openById.",
    },
    {
      call: () => app.openById(""),

      message: "Invalid argument: id",
    },
    {
      call: () => Reflect.apply(app.openByUrl, app, []),

      message: "The parameters () don't match the method signature for SpreadsheetApp.openByUrl.",
    },
    {
      call: () => app.openByUrl("not-a-url"),

      message: "Invalid argument: url",
    },
    {
      call: () => Reflect.apply(app.open, app, []),

      message: "The parameters () don't match the method signature for SpreadsheetApp.open.",
    },
  ];

  for (const { call, message } of cases) {
    let thrown: unknown;

    try {
      call();
    } catch (error) {
      thrown = error;
    }

    expect((thrown as Error).name).toBe("Exception");

    expect((thrown as Error).message).toBe(message);
  }
});

test("flush() returns the characterized null value", () => {
  const app = new SpreadsheetApp(vi.fn(), {
    create: unexpected,
    openById: unexpected,
  });

  expect(app.flush() as unknown).toBeNull();
});
