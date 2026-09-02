import type { EvaluateHtmlTemplate } from "../runtime/execution/types";
import type { RequestLegacySync } from "../runtime/legacy/transport";
import type {
  CreateHtmlOutput,
  CreateHtmlTemplate,
  CreateRange,
  CreateSheet,
} from "../runtime/objects/types";
import type { RuntimeServicePort } from "../runtime/protocol";
import { HtmlOutput } from "../runtime/services/html/HtmlOutput";
import { HtmlTemplate } from "../runtime/services/html/HtmlTemplate";
import { Range } from "../runtime/services/spreadsheet/Range";
import { Sheet } from "../runtime/services/spreadsheet/Sheet";
import { Spreadsheet } from "../runtime/services/spreadsheet/Spreadsheet";
import { File } from "./api/drive/File";
import { Folder } from "./api/drive/Folder";
import type { CreateFile, CreateFolder, CreateSpreadsheet } from "./types";

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
