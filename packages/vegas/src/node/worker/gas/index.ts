import events from "node:events";
import vm from "node:vm";
import worker from "node:worker_threads";

import { excludesGASUserFunctionNames } from "../../../shared/gas";
import { Console } from "./api/base/console";
import { Logger } from "./api/base/Logger";
import { Session } from "./api/base/Session";
import { Cache } from "./api/cache/Cache";
import { CacheService } from "./api/cache/CacheService";
import { HtmlService } from "./api/html/HtmlService";
import { Lock } from "./api/lock/Lock";
import { LockService } from "./api/lock/LockService";
import { Properties } from "./api/properties/Properties";
import { PropertiesService } from "./api/properties/PropertiesService";
import { Range } from "./api/spreadsheet/Range";
import { Sheet } from "./api/spreadsheet/Sheet";
import { Spreadsheet } from "./api/spreadsheet/Spreadsheet";
import { SpreadsheetApp } from "./api/spreadsheet/SpreadsheetApp";
import { UrlFetchApp } from "./api/url_fetch/URLFetchApp";
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

export function requestSync(request: { message: string; payload?: any }, timeout?: number) {
  port.postMessage(request);
  Atomics.store(sharedArray, 0, 1);
  Atomics.wait(sharedArray, 0, 1, timeout);
  const received = worker.receiveMessageOnPort(port);

  return received?.message ?? null;
}

export type RequestSyncFn = typeof requestSync;

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
  DriveApp: undefined,
  /* Forms */
  FormApp: undefined,
  /* Gmail */
  GmailApp: undefined,
  /* Sheets */
  SpreadsheetApp: new SpreadsheetApp(Spreadsheet, Sheet, Range, requestSync),
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
  UrlFetchApp: new UrlFetchApp(),
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
  HtmlService: new HtmlService(),
  /* Mail */
  MailApp: undefined,
  /* Base */
  Browser: undefined,
  Logger: new Logger(),
  MimeType: undefined,
  Session: new Session(),
  console: new Console(),
  /* Cache */
  CacheService: new CacheService(
    new Cache(Scope.DOCUMENT, requestSync),
    new Cache(Scope.SCRIPT, requestSync),
    new Cache(Scope.USER, requestSync),
  ),
  /* Lock */
  LockService: new LockService(
    new Lock(Scope.DOCUMENT),
    new Lock(Scope.SCRIPT),
    new Lock(Scope.USER),
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

function doGetHandler(this: TriggerEvent, htmlOutput: GoogleAppsScript.HTML.HtmlOutput) {
  const result: DoGetResult = {
    metaTags: htmlOutput.getMetaTags().map((metaTag) => {
      return { name: metaTag.getName(), content: metaTag.getContent() };
    }),
    title: htmlOutput.getTitle(),
    faviconUrl: htmlOutput.getFaviconUrl(),
    content: htmlOutput.getContent(),
    xFrameOptionsMode: (htmlOutput as any).getXFrameOptionsMode(),
  };
  this.postMessage(result);
}

class TriggerEvent extends events.EventEmitter {
  #port: worker.MessagePort;

  constructor(port: worker.MessagePort) {
    super();
    this.#port = port;
  }

  on(event: "doGet", listener: (arg: GoogleAppsScript.HTML.HtmlOutput) => void): this;
  on(
    event: (typeof excludesGASUserFunctionNames)[number],
    listener: (...args: any[]) => void,
  ): this {
    super.on(event, listener);
    return this;
  }

  postMessage(data: any) {
    const payload = JSON.stringify(data);
    this.#port.postMessage({ message: "resolve", payload });
  }
}

const triggerEvent = new TriggerEvent(port);
triggerEvent.on("doGet", doGetHandler);

port.on("message", async (data: GASWorkerData) => {
  const result = await scriptContext[data.fn](...data.args);

  if ((excludesGASUserFunctionNames as unknown as string[]).includes(data.fn)) {
    triggerEvent.emit(data.fn, result);
  } else {
    const payload = JSON.stringify(result);
    port.postMessage({ message: "resolve", payload });
  }
});

port.on("close", () => process.exit());
