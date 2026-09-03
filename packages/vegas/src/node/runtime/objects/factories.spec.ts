import { expect, test, vi } from "vitest";

import type { EvaluateHtmlTemplate } from "../execution/types";
import type { RequestLegacySync } from "../legacy/transport";
import type { RuntimeServicePort } from "../protocol";
import { File } from "../services/drive/File";
import { Folder } from "../services/drive/Folder";
import { HtmlOutput } from "../services/html/HtmlOutput";
import { HtmlTemplate } from "../services/html/HtmlTemplate";
import { Range } from "../services/spreadsheet/Range";
import { Sheet } from "../services/spreadsheet/Sheet";
import { Spreadsheet } from "../services/spreadsheet/Spreadsheet";
import { createRuntimeObjectFactories } from "./factories";

function createDependencies() {
  const requestLegacySync: RequestLegacySync = vi.fn();

  const rangeService: RuntimeServicePort<"Range"> = {
    getValue: vi.fn(),
    getValues: vi.fn(),
    setValue: vi.fn(),
    setValues: vi.fn(),
  };

  const sheetService: RuntimeServicePort<"Sheet"> = {
    getLastRow: vi.fn(),
    getLastColumn: vi.fn(),
    getMaxRows: vi.fn(),
    getMaxColumns: vi.fn(),
    getSheetName: vi.fn(),
  };

  const evaluateHtmlTemplate: EvaluateHtmlTemplate = vi.fn();

  return {
    requestLegacySync,
    rangeService,
    sheetService,
    evaluateHtmlTemplate,
  };
}

test("creates runtime-owned GAS objects", () => {
  const factories = createRuntimeObjectFactories(createDependencies());
  const xFrameOptionsMode = {} as GoogleAppsScript.HTML.XFrameOptionsMode;

  expect(factories.createRange("spreadsheet-id", 1, 2, 3, 4, 5)).toBeInstanceOf(Range);
  expect(factories.createSheet("spreadsheet-id", 1)).toBeInstanceOf(Sheet);
  expect(factories.createSpreadsheet("spreadsheet-id")).toBeInstanceOf(Spreadsheet);
  expect(factories.createHtmlOutput("content", xFrameOptionsMode)).toBeInstanceOf(HtmlOutput);
  expect(factories.createHtmlTemplate("template")).toBeInstanceOf(HtmlTemplate);
  expect(factories.createFolder()).toBeInstanceOf(Folder);
  expect(factories.createFile()).toBeInstanceOf(File);
});

test("injects the range service into created ranges", () => {
  const dependencies = createDependencies();
  const getValue = vi.fn(() => "value");
  dependencies.rangeService.getValue = getValue;

  const factories = createRuntimeObjectFactories(dependencies);
  const range = factories.createRange("spreadsheet-id", 7, 2, 3, 1, 1);

  expect(range.getValue()).toBe("value");
  expect(getValue).toHaveBeenCalledWith({
    spreadsheetId: "spreadsheet-id",
    sheetId: 7,
    range: {
      row: 2,
      column: 3,
    },
  });
});

test("injects the template evaluator into created HTML templates", () => {
  const dependencies = createDependencies();
  const output = new HtmlOutput("evaluated", {} as GoogleAppsScript.HTML.XFrameOptionsMode);
  const evaluateHtmlTemplate = vi.fn(() => output);
  dependencies.evaluateHtmlTemplate = evaluateHtmlTemplate;

  const factories = createRuntimeObjectFactories(dependencies);
  const template = factories.createHtmlTemplate("<p>Hello</p>");

  expect(template.evaluate()).toBe(output);
  expect(evaluateHtmlTemplate).toHaveBeenCalledOnce();
});
