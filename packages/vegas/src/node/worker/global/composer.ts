import type { Context } from "node:vm";

import type { RuntimeGlobalEnvironment } from "../../runtime/environment";
import { resolveRuntimeGlobalNamespace } from "../../runtime/globalNamespace";
import { installGasGlobal } from "../../runtime/globals/install";
import { createVmGasObjectFactory } from "../../runtime/globals/object";
import type { RequestLegacySync } from "../../runtime/legacy/transport";
import type { RuntimeLogSink } from "../../runtime/logging";
import type { CreateHtmlOutput, CreateHtmlTemplate } from "../../runtime/objects/types";
import type { RuntimeServicePort } from "../../runtime/protocol";
import { RuntimeScope } from "../../runtime/scope";
import { createMimeType } from "../../runtime/services/base/mimeType";
import { createSession } from "../../runtime/services/base/sessionFacade";
import { createCacheService } from "../../runtime/services/cache/facade";
import { HtmlService } from "../../runtime/services/html/HtmlService";
import { createPropertiesService } from "../../runtime/services/properties/facade";
import { UrlFetchApp } from "../../runtime/services/url-fetch/UrlFetchApp";
import { Utilities } from "../../runtime/services/utilities/Utilities";
import { Console } from "../api/base/console";
import { Logger } from "../api/base/Logger";
import { DriveApp } from "../api/drive/DriveApp";
import { Lock } from "../api/lock/Lock";
import { LockService } from "../api/lock/LockService";
import { SpreadsheetApp } from "../api/spreadsheet/SpreadsheetApp";
import type { CreateFile, CreateFolder, CreateSpreadsheet } from "../types";

export interface GasGlobalComposerDependencies {
  environment: RuntimeGlobalEnvironment;

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
}

const LEGACY_UNSUPPORTED_GLOBAL_NAMES = [
  /* Admin Console */
  "AdminDirectory",
  "AdminLicenseManager",
  "AdminGroupsMigration",
  "AdminGroupsSettings",
  "AdminReseller",
  "AdminReports",

  /* Calendar */
  "CalendarApp",

  /* Chat */
  "Chat",

  /* Docs */
  "DocumentApp",

  /* Drive */

  /* Forms */
  "FormApp",

  /* Gmail */
  "GmailApp",

  /* Sheets */

  /* Slides */
  "SlidesApp",

  /* Workspace */
  "WorkspaceEvents",

  /* Classroom */
  "Classroom",

  /* Groups */
  "GroupsApp",
  "CloudIdentityGroups",

  /* People */
  "People",

  /* Tasks */
  "Tasks",

  /* Google Analytics */
  "AnalyticsData",
  "AnalyticsAdmin",

  /* Google Maps */
  "Maps",

  /* Google Translate */
  "LanguageApp",

  /* Vertex AI */
  "VertexAI",

  /* YouTube */
  "YouTube",
  "YouTubeAnalytics",
  "YouTubeContentId",

  /* AdSense */
  "Adsense",

  /* Display & Video 360 */
  "DisplayVideo",

  /* DoubleClick Bid Manager */
  "DoubleClickBidManager",

  /* DoubleClick Campaigns */
  "DoubleClickCampaigns",

  /* Shopping Content */
  "MerchantApiProducts",
  "ShoppingContent",

  /* Google Data Studio */
  "DataStudioApp",

  /* Google Tag Manager */
  "TagManager",

  /* BigQuery */
  "BigQuery",

  /* JDBC */
  "Jdbc",

  /* URL Fetch */

  /* Optimization */
  "LinearOptimizationService",

  /* Utilities */

  /* XML */
  "XmlService",

  /* Charts */
  "Charts",

  /* Content */
  "ContentService",

  /* HTML */

  /* Mail */
  "MailApp",

  /* Base */
  "Browser",

  /* Script */
  "ScriptApp",
] as const;

type LegacyUnsupportedGlobalName = (typeof LEGACY_UNSUPPORTED_GLOBAL_NAMES)[number];

/**
 * Preserves Vegas' current exposure of not-yet-implemented GAS globals.
 *
 * This is intentionally not the canonical definition of the GAS global
 * environment. Each entry should eventually disappear from this legacy seed
 * as its real GAS-compatible implementation is introduced.
 */
export function createLegacyUnsupportedGlobalSeed(): Record<
  LegacyUnsupportedGlobalName,
  undefined
> {
  return Object.fromEntries(
    LEGACY_UNSUPPORTED_GLOBAL_NAMES.map((name) => [name, undefined]),
  ) as Record<LegacyUnsupportedGlobalName, undefined>;
}

/**
 * Creates and installs the GAS globals currently implemented by Vegas.
 *
 * GAS-visible objects that require object identity are constructed against
 * the target VM realm before being installed into the context.
 */
export function composeGasGlobals(
  context: Context,
  dependencies: GasGlobalComposerDependencies,
): void {
  const {
    environment,
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

  const createGasObject = createVmGasObjectFactory(context);

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

    /* Base */
    Logger: new Logger(logSink),
    MimeType: createMimeType(createGasObject),
    Session: createSession(sessionService, createGasObject),
    console: new Console(logSink),

    /* Cache */
    CacheService: createCacheService(cacheService, createGasObject),

    /* Lock */
    LockService: new LockService(
      new Lock(RuntimeScope.DOCUMENT, requestLegacySync),
      new Lock(RuntimeScope.SCRIPT, requestLegacySync),
      new Lock(RuntimeScope.USER, requestLegacySync),
    ),

    /* Properties */
    PropertiesService: createPropertiesService(propertiesService, {
      documentPropertiesAvailable: environment.properties.documentProperties === "available",
      createObject: createGasObject,
    }),
  } satisfies Record<string, unknown>;

  resolveRuntimeGlobalNamespace([
    {
      source: "builtin",
      names: LEGACY_UNSUPPORTED_GLOBAL_NAMES,
    },
    {
      source: "builtin",
      names: Object.keys(gasGlobals),
    },
  ]);

  for (const [name, value] of Object.entries(gasGlobals)) {
    installGasGlobal(context, name, value);
  }
}
