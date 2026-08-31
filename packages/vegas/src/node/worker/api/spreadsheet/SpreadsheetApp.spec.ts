import { expect, test, vi } from "vitest";

import { SpreadsheetApp } from "./SpreadsheetApp";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

test("create default", () => {
  const spreadsheet = {};
  const createSpreadsheet = vi.fn(() => spreadsheet as any);
  const create = vi.fn(() => "spreadsheet-id");
  const app = new SpreadsheetApp(createSpreadsheet, { create }, unexpected);
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
  const app = new SpreadsheetApp(createSpreadsheet, { create }, unexpected);
  const result = app.create("Test", 10, 5);

  expect(create).toHaveBeenCalledWith({
    name: "Test",
    rows: 10,
    columns: 5,
  });
  expect(createSpreadsheet).toHaveBeenCalledWith("spreadsheet-id");
  expect(result).toBe(spreadsheet);
});

test("openById", () => {
  const spreadsheet = {};
  const createSpreadsheet = vi.fn(() => spreadsheet as any);
  const requestSync = vi.fn(() => "spreadsheet-id");
  const app = new SpreadsheetApp(createSpreadsheet, { create: unexpected }, requestSync);
  app.openById("spreadsheet-id");

  expect(createSpreadsheet).toHaveBeenCalledWith("spreadsheet-id");
  expect(requestSync).toHaveBeenCalledWith({
    message: "SpreadsheetApp#openById",
    payload: { id: "spreadsheet-id" },
  });
});

test("open(file)", () => {
  const spreadsheet = {};
  const createSpreadsheet = vi.fn(() => spreadsheet as any);
  const requestSync = vi.fn(() => "spreadsheet-id");
  const app = new SpreadsheetApp(createSpreadsheet, { create: unexpected }, requestSync);
  const file = {
    getId: vi.fn(() => "spreadsheet-id"),
  } as unknown as GoogleAppsScript.Drive.File;
  app.open(file);

  expect(createSpreadsheet).toHaveBeenCalledWith("spreadsheet-id");
  expect(requestSync).toHaveBeenCalledWith({
    message: "SpreadsheetApp#openById",
    payload: { id: "spreadsheet-id" },
  });
});

test("openByUrl", () => {
  const spreadsheet = {};
  const createSpreadsheet = vi.fn(() => spreadsheet as any);
  const requestSync = vi.fn(() => "abc123");
  const app = new SpreadsheetApp(createSpreadsheet, { create: unexpected }, requestSync);
  app.openByUrl("https://docs.google.com/spreadsheets/d/abc123/edit");

  expect(createSpreadsheet).toHaveBeenCalledWith("abc123");
  expect(requestSync).toHaveBeenCalledWith({
    message: "SpreadsheetApp#openById",
    payload: { id: "abc123" },
  });
});
