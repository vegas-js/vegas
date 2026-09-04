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
import type {
  CreateFile,
  CreateFolder,
  CreateHtmlOutput,
  CreateHtmlTemplate,
  CreateRange,
  CreateSheet,
  CreateSpreadsheet,
} from "./types";

export type RuntimeObjectFactoryDependencies = {
  requestLegacySync: RequestLegacySync;
  rangeService: RuntimeServicePort<"Range">;
  sheetService: RuntimeServicePort<"Sheet">;
  evaluateHtmlTemplate: EvaluateHtmlTemplate;
};

export type RuntimeObjectFactories = {
  createRange: CreateRange;
  createSheet: CreateSheet;
  createSpreadsheet: CreateSpreadsheet;
  createHtmlOutput: CreateHtmlOutput;
  createHtmlTemplate: CreateHtmlTemplate;
  createFolder: CreateFolder;
  createFile: CreateFile;
};

export function createRuntimeObjectFactories(
  dependencies: RuntimeObjectFactoryDependencies,
): RuntimeObjectFactories {
  const { requestLegacySync, rangeService, sheetService, evaluateHtmlTemplate } = dependencies;

  const createRange: CreateRange = (spreadsheetId, sheetId, row, column, numRows, numColumns) =>
    new Range(spreadsheetId, sheetId, row, column, numRows, numColumns, rangeService);

  const createSheet: CreateSheet = (spreadsheetId, sheetId) =>
    new Sheet(spreadsheetId, sheetId, createRange, sheetService, requestLegacySync);

  const createSpreadsheet: CreateSpreadsheet = (spreadsheetId) =>
    new Spreadsheet(spreadsheetId, createSheet);

  const createHtmlOutput: CreateHtmlOutput = (content, defaultXFrameOptionsMode) =>
    new HtmlOutput(content, defaultXFrameOptionsMode);

  const createHtmlTemplate: CreateHtmlTemplate = (content) =>
    new HtmlTemplate(content, evaluateHtmlTemplate);

  const createFolder: CreateFolder = () => new Folder();

  const createFile: CreateFile = () => new File();

  return {
    createRange,
    createSheet,
    createSpreadsheet,
    createHtmlOutput,
    createHtmlTemplate,
    createFolder,
    createFile,
  };
}
