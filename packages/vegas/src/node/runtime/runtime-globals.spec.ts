import { describe, expect, test, vi } from "vitest";

import {
  AppsScriptConsole,
  CacheService,
  ContentService,
  createRuntimeGlobals,
  DriveApp,
  HtmlService,
  LockService,
  Logger,
  Maps,
  MIME_TYPE,
  PropertiesService,
  Session,
  SpreadsheetApp,
  UrlFetchApp,
  Utilities,
  type HostBridge,
  type LoggingTarget,
  type UtilitiesCapability,
} from "./index";

const environment = {
  activeUserEmail: "active@example.com",
  activeUserLocale: "ja",
  effectiveUserEmail: "effective@example.com",
  scriptTimeZone: "Asia/Tokyo",
  temporaryActiveUserKey: "temporary-user-key",
};

const hostBridge: HostBridge = {
  call() {
    throw new Error("unexpected HostBridge call");
  },
};

const utilitiesCapability = new Proxy(
  {},
  {
    get() {
      return () => {
        throw new Error("unexpected Utilities capability call");
      };
    },
  },
) as UtilitiesCapability;

function createLoggingTargetFixture() {
  const info = vi.fn();
  const warn = vi.fn();

  return {
    target: {
      error: vi.fn(),
      info,
      log: vi.fn(),
      time: vi.fn(),
      timeEnd: vi.fn(),
      warn,
    } satisfies LoggingTarget,
    info,
    warn,
  };
}

describe("createRuntimeGlobals", () => {
  test("compose the Apps Script global surface from explicit Runtime dependencies", () => {
    const logging = createLoggingTargetFixture();
    const utilities = new Utilities(utilitiesCapability);
    const globals = createRuntimeGlobals({
      hostBridge,
      environment,
      htmlFiles: {
        "index.html": "<main>Vegas</main>",
      },
      loggingTarget: logging.target,
      utilities,
    });

    expect(globals.DriveApp).toBeInstanceOf(DriveApp);
    expect(globals.SpreadsheetApp).toBeInstanceOf(SpreadsheetApp);
    expect(globals.UrlFetchApp).toBeInstanceOf(UrlFetchApp);
    expect(globals.ContentService).toBeInstanceOf(ContentService);
    expect(globals.HtmlService).toBeInstanceOf(HtmlService);
    expect(globals.Logger).toBeInstanceOf(Logger);
    expect(globals.Maps).toBeInstanceOf(Maps);
    expect(globals.MimeType).toBe(MIME_TYPE);
    expect(globals.Session).toBeInstanceOf(Session);
    expect(globals.console).toBeInstanceOf(AppsScriptConsole);
    expect(globals.CacheService).toBeInstanceOf(CacheService);
    expect(globals.LockService).toBeInstanceOf(LockService);
    expect(globals.PropertiesService).toBeInstanceOf(PropertiesService);
    expect(globals.Utilities).toBe(utilities);

    expect(globals.HtmlService.createHtmlOutputFromFile("index").getContent()).toBe(
      "<main>Vegas</main>",
    );
    expect(globals.Session.getActiveUserLocale()).toBe("ja");

    globals.Logger.log("runtime log");
    globals.console.warn("runtime warning");

    expect(logging.info).toHaveBeenCalledWith("runtime log");
    expect(logging.warn).toHaveBeenCalledWith("runtime warning");
  });

  test("preserve unsupported services as explicit undefined globals", () => {
    const globals = createRuntimeGlobals({
      hostBridge,
      environment,
      htmlFiles: {},
      loggingTarget: createLoggingTargetFixture().target,
      utilities: new Utilities(utilitiesCapability),
    });

    expect(globals.AdminDirectory).toBeUndefined();
    expect(globals.CalendarApp).toBeUndefined();
    expect(globals.DocumentApp).toBeUndefined();
    expect(globals.GmailApp).toBeUndefined();
    expect(globals.ScriptApp).toBeUndefined();
  });
});
