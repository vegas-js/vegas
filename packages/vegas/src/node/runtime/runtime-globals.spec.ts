import { describe, expect, test, vi } from "vitest";

import {
  AppsScriptConsole,
  CacheService,
  createRuntimeGlobals,
  DriveApp,
  HtmlService,
  LockService,
  Logger,
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

function createLoggingTarget(): LoggingTarget {
  return {
    error: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn(),
    warn: vi.fn(),
  };
}

describe("createRuntimeGlobals", () => {
  test("compose the Apps Script global surface from explicit Runtime dependencies", () => {
    const loggingTarget = createLoggingTarget();
    const utilities = new Utilities(utilitiesCapability);
    const globals = createRuntimeGlobals({
      hostBridge,
      environment,
      htmlFiles: {
        "index.html": "<main>Vegas</main>",
      },
      loggingTarget,
      utilities,
    });

    expect(globals.DriveApp).toBeInstanceOf(DriveApp);
    expect(globals.SpreadsheetApp).toBeInstanceOf(SpreadsheetApp);
    expect(globals.UrlFetchApp).toBeInstanceOf(UrlFetchApp);
    expect(globals.HtmlService).toBeInstanceOf(HtmlService);
    expect(globals.Logger).toBeInstanceOf(Logger);
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

    expect(loggingTarget.info).toHaveBeenCalledWith("runtime log");
    expect(loggingTarget.warn).toHaveBeenCalledWith("runtime warning");
  });

  test("preserve unsupported services as explicit undefined globals", () => {
    const globals = createRuntimeGlobals({
      hostBridge,
      environment,
      htmlFiles: {},
      loggingTarget: createLoggingTarget(),
      utilities: new Utilities(utilitiesCapability),
    });

    expect(globals.AdminDirectory).toBeUndefined();
    expect(globals.CalendarApp).toBeUndefined();
    expect(globals.DocumentApp).toBeUndefined();
    expect(globals.GmailApp).toBeUndefined();
    expect(globals.ScriptApp).toBeUndefined();
  });
});
