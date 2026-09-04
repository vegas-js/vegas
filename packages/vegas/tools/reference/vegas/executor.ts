import { invokeScriptFunction } from "../../../src/node/runtime/execution/invocation";
import {
  createScriptContext,
  type ScriptContextDependencies,
} from "../../../src/node/runtime/execution/scriptContext";
import {
  evaluateScript,
  evaluateScriptWithBindings,
} from "../../../src/node/runtime/execution/scriptRuntime";
import type { EvaluateHtmlTemplate } from "../../../src/node/runtime/execution/types";
import type {
  CreateRange,
  CreateSheet,
  CreateSpreadsheet,
} from "../../../src/node/runtime/objects/types";
import { RuntimeServicePort } from "../../../src/node/runtime/protocol";
import { HtmlOutput } from "../../../src/node/runtime/services/html/HtmlOutput";
import { createHtmlOutputFacadeFactory } from "../../../src/node/runtime/services/html/htmlOutputFacade";
import { HtmlTemplate } from "../../../src/node/runtime/services/html/HtmlTemplate";
import { Range } from "../../../src/node/runtime/services/spreadsheet/Range";
import { Sheet } from "../../../src/node/runtime/services/spreadsheet/Sheet";
import { Spreadsheet } from "../../../src/node/runtime/services/spreadsheet/Spreadsheet";
import type { ReferenceExecutor } from "../core/types";

function unexpected(): never {
  throw new Error("Unexpected dependency call while executing reference case");
}

function createReferencePropertiesService(): RuntimeServicePort<"Properties"> {
  const stores = new Map<unknown, Map<string, string>>();
  const getStore = (scope: unknown) => {
    let store = stores.get(scope);
    if (!store) {
      store = new Map<string, string>();
      stores.set(scope, store);
    }

    return store;
  };

  return {
    deleteAllProperties: (scope) => {
      getStore(scope).clear();
    },
    deleteProperty: (scope, key) => {
      getStore(scope).delete(key);
    },
    getKeys: (scope) => {
      return [...getStore(scope).keys()];
    },
    getProperties: (scope) => {
      return Object.fromEntries(getStore(scope));
    },

    getProperty: (scope, key) => {
      return getStore(scope).get(key) ?? null;
    },
    setProperties: (scope, properties, deleteAllOthers) => {
      const store = getStore(scope);
      if (deleteAllOthers) {
        store.clear();
      }
      for (const [key, value] of Object.entries(properties)) {
        store.set(key, value);
      }
    },
    setProperty: (scope, key, value) => {
      getStore(scope).set(key, value);
    },
  };
}

function createReferenceCacheService(): RuntimeServicePort<"Cache"> {
  const stores = new Map<unknown, Map<string, string>>();

  const getStore = (scope: unknown) => {
    let store = stores.get(scope);

    if (!store) {
      store = new Map<string, string>();
      stores.set(scope, store);
    }

    return store;
  };

  return {
    get: (scope, key) => {
      return getStore(scope).get(key) ?? null;
    },

    getAll: (scope, keys) => {
      const store = getStore(scope);
      const result: Record<string, string> = {};

      for (const key of keys) {
        const value = store.get(key);

        if (value !== undefined) {
          result[key] = value;
        }
      }

      return result;
    },

    put: (scope, key, value) => {
      getStore(scope).set(key, value);
    },

    putAll: (scope, values) => {
      const store = getStore(scope);

      for (const [key, value] of Object.entries(values)) {
        store.set(key, value);
      }
    },

    remove: (scope, key) => {
      getStore(scope).delete(key);
    },

    removeAll: (scope, keys) => {
      const store = getStore(scope);

      for (const key of keys) {
        store.delete(key);
      }
    },
  };
}

function createReferenceDependencies(): ScriptContextDependencies {
  const spreadsheetDependencies = createReferenceSpreadsheetDependencies();

  return {
    environment: {
      properties: {
        documentProperties: "unavailable",
      },
    },

    requestLegacySync: unexpected,

    createFile: unexpected,
    createFolder: unexpected,
    createHtmlOutput: unexpected,
    createHtmlTemplate: unexpected,
    createSpreadsheet: spreadsheetDependencies.createSpreadsheet,

    logSink: {
      write: unexpected,
    },

    spreadsheetAppService: spreadsheetDependencies.spreadsheetAppService,

    urlFetchService: {
      fetch: () => createReferenceFetchResponse(),
      fetchAll: (requests) => requests.map(() => createReferenceFetchResponse()),
    },

    htmlService: {
      getFileContent: unexpected,
    },

    sessionService: {
      getActiveUser: () => "active@example.invalid",
      getEffectiveUser: () => "effective@example.invalid",
      getActiveUserLocale: () => "en",
      getScriptTimeZone: () => "Etc/UTC",
      getTemporaryActiveUserKey: () => "reference-user-key",
    },

    cacheService: createReferenceCacheService(),

    propertiesService: createReferencePropertiesService(),
  };
}

const referenceRangeService: RuntimeServicePort<"Range"> = {
  getValue: unexpected,
  getValues: unexpected,
  setValue: unexpected,
  setValues: unexpected,
};

interface ReferenceSpreadsheetState {
  rows: number;
  columns: number;
}

function createReferenceSpreadsheetDependencies() {
  const spreadsheets = new Map<string, ReferenceSpreadsheetState>();

  let sequence = 0;

  const getInitialSheet = (spreadsheetId: string, sheetId: number) => {
    if (sheetId !== 0) {
      return null;
    }

    return spreadsheets.get(spreadsheetId) ?? null;
  };

  const sheetService: RuntimeServicePort<"Sheet"> = {
    getLastRow: ({ spreadsheetId, sheetId }) => {
      return getInitialSheet(spreadsheetId, sheetId) === null ? null : 0;
    },

    getLastColumn: ({ spreadsheetId, sheetId }) => {
      return getInitialSheet(spreadsheetId, sheetId) === null ? null : 0;
    },

    getMaxRows: ({ spreadsheetId, sheetId }) => {
      return getInitialSheet(spreadsheetId, sheetId)?.rows ?? null;
    },

    getMaxColumns: ({ spreadsheetId, sheetId }) => {
      return getInitialSheet(spreadsheetId, sheetId)?.columns ?? null;
    },

    getSheetName: ({ spreadsheetId, sheetId }) => {
      return getInitialSheet(spreadsheetId, sheetId) === null ? null : "Sheet1";
    },
  };

  const createSpreadsheet: CreateSpreadsheet = (spreadsheetId) => {
    const createRange: CreateRange = (
      targetSpreadsheetId,
      sheetId,
      row,
      column,
      numRows,
      numColumns,
    ) =>
      new Range(
        targetSpreadsheetId,
        sheetId,
        row,
        column,
        numRows,
        numColumns,
        referenceRangeService,
      );

    const createSheet: CreateSheet = (targetSpreadsheetId, sheetId) =>
      new Sheet(targetSpreadsheetId, sheetId, createRange, sheetService, unexpected);

    return new Spreadsheet(spreadsheetId, createSheet, unexpected);
  };

  const spreadsheetAppService: RuntimeServicePort<"SpreadsheetApp"> = {
    create: ({ rows, columns }) => {
      sequence += 1;

      const spreadsheetId = `reference-spreadsheet-${sequence}`;

      spreadsheets.set(spreadsheetId, {
        rows,
        columns,
      });

      return spreadsheetId;
    },
  };

  return {
    createSpreadsheet,
    spreadsheetAppService,
  };
}

function createReferenceFetchResponse() {
  return {
    headers: {
      "Content-Type": "text/plain",
      "X-Vegas-Reference": "true",
    },
    content: Array.from(Buffer.from("vegas-reference-response", "utf8")),
    responseCode: 200,
  };
}

export function createVegasReferenceExecutor(source: string): ReferenceExecutor {
  const htmlOutputFacadeFactory = createHtmlOutputFacadeFactory();

  let templateContext: ReturnType<typeof createScriptContext> | undefined;

  const evaluateHtmlTemplate: EvaluateHtmlTemplate = (templateCode, bindings) => {
    if (!templateContext) {
      throw new Error("Reference script context is not initialized");
    }

    return evaluateScriptWithBindings(templateCode, templateContext, bindings);
  };

  const context = createScriptContext({
    ...createReferenceDependencies(),
    htmlOutputFacadeFactory,
    createHtmlOutput: (content: string, mode: GoogleAppsScript.HTML.XFrameOptionsMode) =>
      new HtmlOutput(content, mode),
    createHtmlTemplate: (content: string) => new HtmlTemplate(content, evaluateHtmlTemplate),
  });

  templateContext = context;

  evaluateScript(source, context);

  return {
    execute(functionName) {
      return invokeScriptFunction(context, functionName, [], {
        getHtmlOutputXFrameOptionsMode: (htmlOutputFacadeFactory as any).resolveXFrameOptionsMode,
      });
    },
  };
}
