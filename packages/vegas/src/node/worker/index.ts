import vm from "node:vm";
import worker from "node:worker_threads";

import { RuntimeScope } from "../runtime/scope";
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
import { HtmlTemplate } from "./api/html/HtmlTemplate";
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
import {
  createRangeService,
  createSessionService,
  createCacheService,
  createPropertiesService,
} from "./remoteServices";
import { createRuntimeServiceCaller } from "./runtimeTransport";
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
export const scriptContext = vm.createContext({
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
  DriveApp: new DriveApp(createFile, createFolder, requestLegacySync),
  /* Forms */
  FormApp: undefined,
  /* Gmail */
  GmailApp: undefined,
  /* Sheets */
  SpreadsheetApp: new SpreadsheetApp(createSpreadsheet, requestLegacySync),
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
  UrlFetchApp: new UrlFetchApp(requestLegacySync),
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
  HtmlService: new HtmlService(createHtmlOutput, createHtmlTemplate, requestLegacySync),
  /* Mail */
  MailApp: undefined,
  /* Base */
  Browser: undefined,
  Logger: new Logger(),
  MimeType: undefined,
  Session: new Session(sessionService),
  console: new Console(),
  /* Cache */
  CacheService: new CacheService(
    new Cache(RuntimeScope.DOCUMENT, cacheService),
    new Cache(RuntimeScope.SCRIPT, cacheService),
    new Cache(RuntimeScope.USER, cacheService),
  ),
  /* Lock */
  LockService: new LockService(
    new Lock(RuntimeScope.DOCUMENT, requestLegacySync),
    new Lock(RuntimeScope.SCRIPT, requestLegacySync),
    new Lock(RuntimeScope.USER, requestLegacySync),
  ),
  /* Properties */
  PropertiesService: new PropertiesService(
    new Properties(RuntimeScope.DOCUMENT, propertiesService),
    new Properties(RuntimeScope.SCRIPT, propertiesService),
    new Properties(RuntimeScope.USER, propertiesService),
  ),
  // ScriptProperties is Deprecated.
  // UserProperties is Deprecated.
  /* Script */
  ScriptApp: undefined,
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
