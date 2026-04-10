import vm from "node:vm";
import worker from "node:worker_threads";

import { Console } from "./api/base/console";
import { Logger } from "./api/base/Logger";
import { Session } from "./api/base/Session";
import { Cache } from "./api/cache/Cache";
import { CacheService } from "./api/cache/CacheService";
import { DriveApp } from "./api/drive/DriveApp";
import { File } from "./api/drive/File";
import { Folder } from "./api/drive/Folder";
import { HtmlOutput } from "./api/html/HtmlOutput";
import { HtmlService } from "./api/html/HtmlService";
import { Lock } from "./api/lock/Lock";
import { LockService } from "./api/lock/LockService";
import { Properties } from "./api/properties/Properties";
import { PropertiesService } from "./api/properties/PropertiesService";
import { Range } from "./api/spreadsheet/Range";
import { Sheet } from "./api/spreadsheet/Sheet";
import { Spreadsheet } from "./api/spreadsheet/Spreadsheet";
import { SpreadsheetApp } from "./api/spreadsheet/SpreadsheetApp";
import { UrlFetchApp } from "./api/url_fetch/UrlFetchApp";
import { Utilities } from "./api/utilities/Utilities";

type GASWorkerData = {
  fn: string;
  args: any[];
};

const Scope = {
  DOCUMENT: "document",
  SCRIPT: "script",
  USER: "user",
} as const;

export type Scope = (typeof Scope)[keyof typeof Scope];

function requestSync(request: { message: string; payload?: any }, timeout?: number) {
  port.postMessage(request);
  Atomics.store(sharedArray, 0, 1);
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

function createHtmlOutput(
  content: string,
  defaultXFrameOptionsMode: GoogleAppsScript.HTML.XFrameOptionsMode,
): GoogleAppsScript.HTML.HtmlOutput {
  return new HtmlOutput(content, defaultXFrameOptionsMode);
}
export type CreateHtmlOutput = typeof createHtmlOutput;

function createFolder(): GoogleAppsScript.Drive.Folder {
  return new Folder();
}
export type CreateFolder = typeof createFolder;

function createFile(): GoogleAppsScript.Drive.File {
  return new File();
}
export type CreateFile = typeof createFile;

const script = new vm.Script(worker.workerData.code);
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
  DriveApp: new DriveApp(createFile, createFolder, requestSync),
  /* Forms */
  FormApp: undefined,
  /* Gmail */
  GmailApp: undefined,
  /* Sheets */
  SpreadsheetApp: new SpreadsheetApp(createSpreadsheet, requestSync),
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
  UrlFetchApp: new UrlFetchApp(requestSync),
  /* Optimization */
  LinearOptimizationService: undefined,
  /* Utilities */
  Utilities: new Utilities(),
  /* XML */
  XmlService: undefined,
  /* Charts */
  Charts: undefined,
  /* Content */
  ContentService: undefined,
  /* HTML */
  HtmlService: new HtmlService(createHtmlOutput, requestSync),
  /* Mail */
  MailApp: undefined,
  /* Base */
  Browser: undefined,
  Logger: new Logger(),
  MimeType: undefined,
  Session: new Session(requestSync),
  console: new Console(),
  /* Cache */
  CacheService: new CacheService(
    new Cache(Scope.DOCUMENT, requestSync),
    new Cache(Scope.SCRIPT, requestSync),
    new Cache(Scope.USER, requestSync),
  ),
  /* Lock */
  LockService: new LockService(
    new Lock(Scope.DOCUMENT, requestSync),
    new Lock(Scope.SCRIPT, requestSync),
    new Lock(Scope.USER, requestSync),
  ),
  /* Properties */
  PropertiesService: new PropertiesService(
    new Properties(Scope.DOCUMENT, requestSync),
    new Properties(Scope.SCRIPT, requestSync),
    new Properties(Scope.USER, requestSync),
  ),
  // ScriptProperties is Deprecated.
  // UserProperties is Deprecated.
  /* Script */
  ScriptApp: undefined,
});
script.runInContext(scriptContext);

const sharedArray: Int32Array = worker.workerData.sharedArray;
const port: worker.MessagePort = worker.workerData.port;

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
