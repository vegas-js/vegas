import { createCacheService } from "./cache-objects";
import { createDriveApp } from "./drive-object-hydrator";
import type { HostBridge } from "./host-bridge";
import { createHtmlService } from "./html-service";
import type { InvocationEnvironment } from "./invocation";
import { createLockService } from "./lock-objects";
import { createConsole, createLogger, type LoggingTarget } from "./logging";
import { createPropertiesService } from "./properties-objects";
import { createSession } from "./session-objects";
import { createSpreadsheetApp } from "./spreadsheet-object-hydrator";
import { createUrlFetchApp } from "./url-fetch-app";
import type { Utilities } from "./utilities";

export interface RuntimeGlobalsOptions {
  readonly hostBridge: HostBridge;
  readonly environment: InvocationEnvironment;
  readonly htmlFiles: Readonly<Record<string, string>>;
  readonly loggingTarget: LoggingTarget;
  readonly utilities: Utilities;
}

export function createRuntimeGlobals(options: RuntimeGlobalsOptions) {
  const { hostBridge, environment, htmlFiles, loggingTarget, utilities } = options;

  return {
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
    Utilities: utilities,
    /* XML */
    XmlService: undefined,
    /* Charts */
    Charts: undefined,
    /* Content */
    ContentService: undefined,
    /* HTML */
    HtmlService: createHtmlService(htmlFiles),
    /* Mail */
    MailApp: undefined,
    /* Base */
    Browser: undefined,
    Logger: createLogger(loggingTarget),
    MimeType: undefined,
    Session: createSession(environment),
    console: createConsole(loggingTarget),
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
  };
}
