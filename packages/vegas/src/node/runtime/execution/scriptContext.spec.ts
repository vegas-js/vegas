import { expect, test } from "vitest";

import type { RuntimeGlobalEnvironment } from "../environment";
import { createScriptContext, type ScriptContextDependencies } from "./scriptContext";

const GAS_GLOBAL_NAMES = [
  "DriveApp",
  "SpreadsheetApp",
  "UrlFetchApp",
  "Utilities",
  "HtmlService",
  "Logger",
  "Session",
  "console",
  "CacheService",
  "LockService",
  "PropertiesService",
] as const;

const DOCUMENT_PROPERTIES_AVAILABLE_ENVIRONMENT: RuntimeGlobalEnvironment = {
  properties: {
    documentProperties: "available",
  },
};

const DOCUMENT_PROPERTIES_UNAVAILABLE_ENVIRONMENT: RuntimeGlobalEnvironment = {
  properties: {
    documentProperties: "unavailable",
  },
};

function unexpected(): never {
  throw new Error("Unexpected dependency call while creating script context");
}

function createDependencies(
  environment: RuntimeGlobalEnvironment = DOCUMENT_PROPERTIES_AVAILABLE_ENVIRONMENT,
): ScriptContextDependencies {
  return {
    environment,

    requestLegacySync: unexpected,

    createFile: unexpected,
    createFolder: unexpected,
    createHtmlOutput: unexpected,
    createHtmlTemplate: unexpected,
    createSpreadsheet: unexpected,

    logSink: {
      write: unexpected,
    },

    spreadsheetAppService: {
      create: unexpected,
    },

    urlFetchService: {
      fetch: unexpected,
      fetchAll: unexpected,
    },

    htmlService: {
      getFileContent: unexpected,
    },

    sessionService: {
      getActiveUser: unexpected,
      getEffectiveUser: unexpected,
      getActiveUserLocale: unexpected,
      getScriptTimeZone: unexpected,
      getTemporaryActiveUserKey: unexpected,
    },

    cacheService: {
      get: unexpected,
      getAll: unexpected,
      put: unexpected,
      putAll: unexpected,
      remove: unexpected,
      removeAll: unexpected,
    },

    propertiesService: {
      deleteAllProperties: unexpected,
      deleteProperty: unexpected,
      getKeys: unexpected,
      getProperties: unexpected,
      getProperty: unexpected,
      setProperties: unexpected,
      setProperty: unexpected,
    },
  };
}

test.each(GAS_GLOBAL_NAMES)(
  "installs %s with GAS-compatible global property descriptor",
  (name) => {
    const context = createScriptContext(createDependencies());

    expect(Object.prototype.hasOwnProperty.call(context, name)).toBe(true);

    const descriptor = Object.getOwnPropertyDescriptor(context, name);

    expect(descriptor).toBeDefined();
    expect(descriptor).toMatchObject({
      configurable: true,
      enumerable: false,
      writable: true,
    });
    expect(descriptor).not.toHaveProperty("get");
    expect(descriptor).not.toHaveProperty("set");
  },
);

test("disables DocumentProperties through the runtime global environment", () => {
  const context = createScriptContext(
    createDependencies(DOCUMENT_PROPERTIES_UNAVAILABLE_ENVIRONMENT),
  );

  expect(context.PropertiesService.getDocumentProperties()).toBeNull();
});

test("enables DocumentProperties through the runtime global environment", () => {
  const context = createScriptContext(
    createDependencies(DOCUMENT_PROPERTIES_AVAILABLE_ENVIRONMENT),
  );

  const properties = context.PropertiesService.getDocumentProperties();

  expect(properties).not.toBeNull();
  expect(String(properties)).toBe("DocumentProperties");
});
