import type { RuntimeServicePort } from "../runtime/protocol";
import { File } from "./api/drive/File";
import { Folder } from "./api/drive/Folder";
import { HtmlOutput } from "./api/html/HtmlOutput";
import { HtmlTemplate } from "./api/html/HtmlTemplate";
import { Range } from "./api/spreadsheet/Range";
import { Sheet } from "./api/spreadsheet/Sheet";
import { Spreadsheet } from "./api/spreadsheet/Spreadsheet";
import type {
  CreateFile,
  CreateFolder,
  CreateHtmlOutput,
  CreateHtmlTemplate,
  CreateRange,
  CreateSheet,
  CreateSpreadsheet,
  EvaluateHtmlTemplate,
  RequestLegacySync,
} from "./types";

type ObjectFactories = {
  createRange: CreateRange;
  createSheet: CreateSheet;
  createSpreadsheet: CreateSpreadsheet;
  createHtmlOutput: CreateHtmlOutput;
  createHtmlTemplate: CreateHtmlTemplate;
  createFolder: CreateFolder;
  createFile: CreateFile;
};

export function createObjectFactories(
  requestLegacySync: RequestLegacySync,
  rangeService: RuntimeServicePort<"Range">,
  sheetService: RuntimeServicePort<"Sheet">,
  evaluateHtmlTemplate: EvaluateHtmlTemplate,
): ObjectFactories {
  const createRange: CreateRange = (spreadsheetId, sheetId, row, column, numRows, numColumns) =>
    new Range(spreadsheetId, sheetId, row, column, numRows, numColumns, rangeService);
  const createSheet: CreateSheet = (spreadsheetId, sheetId) =>
    new Sheet(spreadsheetId, sheetId, createRange, sheetService, requestLegacySync);
  const createSpreadsheet: CreateSpreadsheet = (spreadsheetId) =>
    new Spreadsheet(spreadsheetId, createSheet, requestLegacySync);
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
