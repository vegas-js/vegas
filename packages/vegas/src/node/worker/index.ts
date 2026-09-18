import vm from "node:vm";
import worker from "node:worker_threads";

import { createCacheService } from "../runtime/cache-objects";
import { createDriveApp } from "../runtime/drive-object-hydrator";
import { serializeHtmlOutput } from "../runtime/html-output";
import { createHtmlService } from "../runtime/html-service";
import type { InvocationEnvironment } from "../runtime/invocation";
import { createLockService } from "../runtime/lock-objects";
import { createConsole, createLogger } from "../runtime/logging";
import type { Program } from "../runtime/program";
import { createPropertiesService } from "../runtime/properties-objects";
import { createSession } from "../runtime/session-objects";
import { createSpreadsheetApp } from "../runtime/spreadsheet-object-hydrator";
import { createUrlFetchApp } from "../runtime/url-fetch-app";
import { createUtilities } from "../runtime/utilities";
import { createWorkerHostBridge } from "../runtime/worker-host-bridge";
import { Range } from "./api/spreadsheet/Range";
import { Sheet } from "./api/spreadsheet/Sheet";
import { Spreadsheet } from "./api/spreadsheet/Spreadsheet";

type RuntimeWorkerData = {
  readonly program: Program;
  readonly environment: InvocationEnvironment;
  readonly port: worker.MessagePort;
  readonly sharedArray: Int32Array;
};

type GASWorkerData = {
  fn: string;
  args: any[];
};

const runtimeWorkerData = worker.workerData as RuntimeWorkerData;
const sharedArray = runtimeWorkerData.sharedArray;
const port = runtimeWorkerData.port;
const hostBridge = createWorkerHostBridge(port, sharedArray);

function requestSync(request: { message: string; payload?: any }, timeout?: number) {
  Atomics.store(sharedArray, 0, 1);
  port.postMessage(request);
  Atomics.wait(sharedArray, 0, 1, timeout);
  const received = worker.receiveMessageOnPort(port);

  return received?.message ?? null;
}
export type RequestSync = typeof requestSync;

function createRange(
  spreadsheetId: string,
  sheetId: number,
  row: number,
  column: number,
  numRows: number,
  numColumns: number,
): GoogleAppsScript.Spreadsheet.Range {
  return new Range(spreadsheetId, sheetId, row, column, numRows, numColumns, requestSync);
}
export type CreateRange = typeof createRange;

function createSheet(spreadsheetId: string, sheetId: number): GoogleAppsScript.Spreadsheet.Sheet {
  return new Sheet(spreadsheetId, sheetId, createRange, requestSync);
}
export type CreateSheet = typeof createSheet;

function createSpreadsheet(spreadsheetId: string): GoogleAppsScript.Spreadsheet.Spreadsheet {
  return new Spreadsheet(spreadsheetId, createSheet, requestSync);
}
export type CreateSpreadsheet = typeof createSpreadsheet;

const script = new vm.Script(runtimeWorkerData.program.source);
const scriptContext = vm.createContext({
  /* Admin Console */
  AdminDirectory: undefined, // Advanced services. Low priority.
  AdminLicenseManager: undefined, // Advanced services. Low priority.
  AdminGroupsMigration: undefined, // Advanced services. Low priority.
  AdminGroupsSettings: undefined, // Advanced services. Low priority.
  AdminReseller: undefined, // Advanced services. Low priority.
  AdminReports: undefined, // Advanced services. Low priority.
  /* Calendar */
  CalendarApp: undefined,
  /* Chat */
  Chat: undefined, // Advanced services. Low priority.
  /* Docs */
  DocumentApp: undefined,
  /* Drive */
  DriveApp: createDriveApp(hostBridge),
  /* Forms */
  FormApp: undefined,
  /* Gmail */
  GmailApp: undefined,
  /* Sheets */
  SpreadsheetApp: createSpreadsheetApp(hostBridge),
  /* Slides */
  SlidesApp: undefined,
  /* Workspace */
  WorkspaceEvents: undefined, // Advanced services. Low priority.
  /* Classroom */
  Classroom: undefined,
  /* Groups */
  GroupsApp: undefined,
  CloudIdentityGroups: undefined, // Advanced services. Low priority.
  /* People */
  People: undefined, // Advanced services. Low priority.
  /* Tasks */
  Tasks: undefined, // Advanced services. Low priority.
  /* ---------------------------------------- */
  /* Google Analytics */
  AnalyticsData: undefined, // Advanced services. Low priority.
  AnalyticsAdmin: undefined, // Advanced services. Low priority.
  /* Google Maps */
  Maps: undefined,
  /* Google Translate */
  LanguageApp: undefined,
  /* Vertex AI */
  VertexAI: undefined, // Advanced services. Low priority.
  /* Youtube */
  YouTube: undefined, // Advanced services. Low priority.
  YouTubeAnalytics: undefined, // Advanced services. Low priority.
  YouTubeContentId: undefined, // Advanced services. Low priority.
  /* AdSense */
  Adsense: undefined, // Advanced services. Low priority.
  /* Display & Video 360 */
  DisplayVideo: undefined, // Advanced services. Low priority.
  /* DoubleClick Bid Manager */
  DoubleClickBidManager: undefined, // Advanced services. Low priority.
  /* DoubleClick Campaigns */
  DoubleClickCampaigns: undefined, // Advanced services. Low priority.
  /* Shopping Content */
  MerchantApiProducts: undefined, // Advanced services. Low priority.
  ShoppingContent: undefined, // Advanced services. Low priority.
  /* Google Data Studio */
  DataStudioApp: undefined,
  /* Google Tag Manager */
  TagManager: undefined, // Advanced services. Low priority.
  /* ---------------------------------------- */
  /* BigQuery */
  BigQuery: undefined, // Advanced services. Low priority.
  /* JDBC */
  Jdbc: undefined,
  /* URL Fetch */
  UrlFetchApp: createUrlFetchApp(hostBridge),
  /* Optimization */
  LinearOptimizationService: undefined,
  /* Utilities */
  Utilities: createUtilities(),
  /* XML */
  XmlService: undefined,
  /* Charts */
  Charts: undefined,
  /* Content */
  ContentService: undefined,
  /* HTML */
  HtmlService: createHtmlService(runtimeWorkerData.program.htmlFiles),
  /* Mail */
  MailApp: undefined,
  /* Base */
  Browser: undefined,
  Logger: createLogger(console),
  MimeType: undefined,
  Session: createSession(runtimeWorkerData.environment),
  console: createConsole(console),
  /* Cache */
  CacheService: createCacheService(hostBridge),
  /* Lock */
  LockService: createLockService(hostBridge),
  /* Properties */
  PropertiesService: createPropertiesService(hostBridge),
  // ScriptProperties is Deprecated.
  // UserProperties is Deprecated.
  /* Script */
  ScriptApp: undefined,
});
script.runInContext(scriptContext);

async function invokeFn(fn: Function, ...args: any[]) {
  const result = await fn(...args);
  if (fn.name === "doGet") {
    return serializeHtmlOutput(result);
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
