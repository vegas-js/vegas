import vm from "node:vm";
import worker from "node:worker_threads";

import { File } from "./api/drive/File";
import { Folder } from "./api/drive/Folder";
import { HtmlOutput } from "./api/html/HtmlOutput";
import { HtmlTemplate } from "./api/html/HtmlTemplate";
import { Range } from "./api/spreadsheet/Range";
import { Sheet } from "./api/spreadsheet/Sheet";
import { Spreadsheet } from "./api/spreadsheet/Spreadsheet";
import {
  createRangeService,
  createSessionService,
  createCacheService,
  createPropertiesService,
} from "./remoteServices";
import { createRuntimeServiceCaller } from "./runtimeTransport";
import { createScriptContext } from "./scriptContext";
import type {
  CreateFile,
  CreateFolder,
  CreateHtmlOutput,
  CreateHtmlTemplate,
  CreateRange,
  CreateSheet,
  CreateSpreadsheet,
  RequestLegacySync,
} from "./types";

const sharedArray: Int32Array = worker.workerData.sharedArray;
const port: worker.MessagePort = worker.workerData.port;

type GASWorkerData = {
  fn: string;
  args: any[];
};

const requestLegacySync: RequestLegacySync = (request, timeout) => {
  Atomics.store(sharedArray, 0, 1);
  port.postMessage(request);
  Atomics.wait(sharedArray, 0, 1, timeout);
  const received = worker.receiveMessageOnPort(port);

  return received?.message ?? null;
};

const callService = createRuntimeServiceCaller(sharedArray, port);
const rangeService = createRangeService(callService);
const sessionService = createSessionService(callService);
const cacheService = createCacheService(callService);
const propertiesService = createPropertiesService(callService);

const createRange: CreateRange = (spreadsheetId, sheetId, row, column, numRows, numColumns) =>
  new Range(spreadsheetId, sheetId, row, column, numRows, numColumns, rangeService);
const createSheet: CreateSheet = (spreadsheetId, sheetId) =>
  new Sheet(spreadsheetId, sheetId, createRange, requestLegacySync);
const createSpreadsheet: CreateSpreadsheet = (spreadsheetId) =>
  new Spreadsheet(spreadsheetId, createSheet, requestLegacySync);
const createHtmlOutput: CreateHtmlOutput = (content, defaultXFrameOptionsMode) =>
  new HtmlOutput(content, defaultXFrameOptionsMode);
const createHtmlTemplate: CreateHtmlTemplate = (content) => new HtmlTemplate(content);
const createFolder: CreateFolder = () => new Folder();
const createFile: CreateFile = () => new File();

const script = new vm.Script(worker.workerData.code);
export const scriptContext = createScriptContext({
  requestLegacySync,
  createFile,
  createFolder,
  createHtmlOutput,
  createHtmlTemplate,
  createSpreadsheet,
  sessionService,
  cacheService,
  propertiesService,
});
script.runInContext(scriptContext);

interface DoGetResult {
  metaTags: { name: string; content: string }[];
  title: string;
  faviconUrl: string;
  content: string;
  xFrameOptionsMode: string;
}

async function invokeFn(fn: Function, ...args: any[]) {
  const result = await fn(...args);
  if (fn.name === "doGet") {
    return {
      metaTags: result.getMetaTags().map((metaTag: any) => {
        return { name: metaTag.getName(), content: metaTag.getContent() };
      }),
      title: result.getTitle(),
      faviconUrl: result.getFaviconUrl(),
      content: result.getContent(),
      xFrameOptionsMode: (result as any).getXFrameOptionsMode(),
    } satisfies DoGetResult;
  } else if (fn.name === "doPost") {
    return {
      mimeType: typeof result.getMimeType === "function" ? result.getMimeType() : "text/html",
      content: result.getContent(),
    };
  }

  return result;
}

port.on("message", async (data: GASWorkerData) => {
  const targetFn = scriptContext[data.fn];
  if (typeof targetFn !== "function") {
    throw new Error(`${data.fn} is not a function`);
  }

  const result = await invokeFn(targetFn, ...data.args);
  port.postMessage({ message: "resolve", payload: result });
});

port.on("close", () => process.exit());
