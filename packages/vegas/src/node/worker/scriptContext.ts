import vm from "node:vm";

import type { RuntimeLogSink } from "../runtime/logging";
import type { RuntimeServicePort } from "../runtime/protocol";
import { RuntimeScope } from "../runtime/scope";
import { Console } from "./api/base/console";
import { Logger } from "./api/base/Logger";
import { Session } from "./api/base/Session";
import { Cache } from "./api/cache/Cache";
import { CacheService } from "./api/cache/CacheService";
import { DriveApp } from "./api/drive/DriveApp";
import { HtmlService } from "./api/html/HtmlService";
import { Lock } from "./api/lock/Lock";
import { LockService } from "./api/lock/LockService";
import { Properties } from "./api/properties/Properties";
import { PropertiesService } from "./api/properties/PropertiesService";
import { SpreadsheetApp } from "./api/spreadsheet/SpreadsheetApp";
import { UrlFetchApp } from "./api/url_fetch/UrlFetchApp";
import { Utilities } from "./api/utilities/Utilities";
import { installGasGlobal } from "./global/installGasGlobal";
import type {
  RequestLegacySync,
  CreateFile,
  CreateFolder,
  CreateHtmlOutput,
  CreateHtmlTemplate,
  CreateSpreadsheet,
} from "./types";

export type ScriptContextDependencies = {
  requestLegacySync: RequestLegacySync;

  createFile: CreateFile;
  createFolder: CreateFolder;
  createHtmlOutput: CreateHtmlOutput;
  createHtmlTemplate: CreateHtmlTemplate;
  createSpreadsheet: CreateSpreadsheet;

  logSink: RuntimeLogSink;

  spreadsheetAppService: RuntimeServicePort<"SpreadsheetApp">;
  urlFetchService: RuntimeServicePort<"UrlFetch">;
  htmlService: RuntimeServicePort<"Html">;
  sessionService: RuntimeServicePort<"Session">;
  cacheService: RuntimeServicePort<"Cache">;
  propertiesService: RuntimeServicePort<"Properties">;
};

export function createScriptContext(dependencies: ScriptContextDependencies): vm.Context {
  const {
    requestLegacySync,
    createFile,
    createFolder,
    createHtmlOutput,
    createHtmlTemplate,
    createSpreadsheet,
    logSink,
    spreadsheetAppService,
    urlFetchService,
    htmlService,
    sessionService,
    cacheService,
    propertiesService,
  } = dependencies;

  const gasGlobals = {
    /* Drive */
    DriveApp: new DriveApp(createFile, createFolder, requestLegacySync),
    /* Sheets */
    SpreadsheetApp: new SpreadsheetApp(createSpreadsheet, spreadsheetAppService),
    /* URL Fetch */
    UrlFetchApp: new UrlFetchApp(urlFetchService),
    /* Utilities */
    Utilities: new Utilities(),
    /* HTML */
    HtmlService: new HtmlService(createHtmlOutput, createHtmlTemplate, htmlService),
    Logger: new Logger(logSink),
    Session: new Session(sessionService),
    console: new Console(logSink),
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
  };

  const context = vm.createContext({
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
    // DriveApp: new DriveApp(createFile, createFolder, requestLegacySync),
    /* Forms */
    FormApp: undefined,
    /* Gmail */
    GmailApp: undefined,
    /* Sheets */
    // SpreadsheetApp: new SpreadsheetApp(createSpreadsheet, spreadsheetAppService),
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
    // UrlFetchApp: new UrlFetchApp(urlFetchService),
    /* Optimization */
    LinearOptimizationService: undefined,
    /* Utilities */
    // Utilities: new Utilities(),
    /* XML */
    XmlService: undefined,
    /* Charts */
    Charts: undefined,
    /* Content */
    ContentService: undefined,
    /* HTML */
    // HtmlService: new HtmlService(createHtmlOutput, createHtmlTemplate, htmlService),
    /* Mail */
    MailApp: undefined,
    /* Base */
    Browser: undefined,
    // Logger: new Logger(logSink),
    MimeType: undefined,
    // Session: new Session(sessionService),
    // console: new Console(logSink),
    /* Cache */
    // CacheService: new CacheService(
    //   new Cache(RuntimeScope.DOCUMENT, cacheService),
    //   new Cache(RuntimeScope.SCRIPT, cacheService),
    //   new Cache(RuntimeScope.USER, cacheService),
    // ),
    /* Lock */
    // LockService: new LockService(
    //   new Lock(RuntimeScope.DOCUMENT, requestLegacySync),
    //   new Lock(RuntimeScope.SCRIPT, requestLegacySync),
    //   new Lock(RuntimeScope.USER, requestLegacySync),
    // ),
    /* Properties */
    // PropertiesService: new PropertiesService(
    //   new Properties(RuntimeScope.DOCUMENT, propertiesService),
    //   new Properties(RuntimeScope.SCRIPT, propertiesService),
    //   new Properties(RuntimeScope.USER, propertiesService),
    // ),
    // ScriptProperties is Deprecated.
    // UserProperties is Deprecated.
    /* Script */
    ScriptApp: undefined,
  });

  for (const [name, value] of Object.entries(gasGlobals)) {
    installGasGlobal(context, name, value);
  }

  return context;
}
