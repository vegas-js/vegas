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
import type { RequestLegacySync } from "../../../src/node/runtime/legacy/transport";
import type {
  CreateRange,
  CreateSheet,
  CreateSpreadsheet,
} from "../../../src/node/runtime/objects/types";
import type {
  RuntimeFetchRequest,
  RuntimeFetchResponse,
  RuntimeServicePort,
} from "../../../src/node/runtime/protocol";
import { HtmlOutput } from "../../../src/node/runtime/services/html/HtmlOutput";
import { createHtmlOutputFacadeFactory } from "../../../src/node/runtime/services/html/htmlOutputFacade";
import { HtmlTemplate } from "../../../src/node/runtime/services/html/HtmlTemplate";
import { Range } from "../../../src/node/runtime/services/spreadsheet/Range";
import { Sheet } from "../../../src/node/runtime/services/spreadsheet/Sheet";
import { Spreadsheet } from "../../../src/node/runtime/services/spreadsheet/Spreadsheet";
import type { ReferenceExecutor } from "../core/types";
import { projectVegasExecutionError } from "./executionErrorProjection";

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

function createReferenceLegacySync(): RequestLegacySync {
  return (request) => {
    switch (request.message) {
      case "Lock#tryLock":
      case "Lock#waitLock":
        /*
         * Characterizes the uncontended
         * single-execution Lock semantics.
         *
         * Host-side contention and ownership
         * arbitration are intentionally outside
         * this reference executor.
         */
        return true;

      case "Lock#releaseLock":
        return null;

      default:
        return unexpected();
    }
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

    requestLegacySync: createReferenceLegacySync(),

    createFile: unexpected,
    createFolder: unexpected,
    createHtmlOutput: unexpected,
    createHtmlTemplate: unexpected,
    createSpreadsheet: spreadsheetDependencies.createSpreadsheet,

    logSink: {
      write: () => {},
    },

    spreadsheetAppService: spreadsheetDependencies.spreadsheetAppService,

    urlFetchService: {
      fetch: (request) => createReferenceFetchResponse(request),
      fetchAll: (requests) => requests.map((request) => createReferenceFetchResponse(request)),
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

interface ReferenceSpreadsheetState {
  rows: number;
  columns: number;
  cells: any[][];
}

function createReferenceGasException(message: string): Error {
  const error = new Error(message);
  error.name = "Exception";
  return error;
}

function createReferenceSpreadsheetDependencies() {
  const spreadsheets = new Map<string, ReferenceSpreadsheetState>();

  const reusableSpreadsheetId = "vegas-reference-existing-spreadsheet";

  spreadsheets.set(reusableSpreadsheetId, {
    rows: 1,
    columns: 1,
    cells: [[""]],
  });

  let sequence = 0;

  const getInitialSheet = (spreadsheetId: string, sheetId: number) => {
    if (sheetId !== 0) {
      return null;
    }

    return spreadsheets.get(spreadsheetId) ?? null;
  };

  const getLastRow = (state: ReferenceSpreadsheetState) => {
    for (let rowIndex = state.cells.length - 1; rowIndex >= 0; rowIndex--) {
      if (state.cells[rowIndex].some((value) => value !== "")) {
        return rowIndex + 1;
      }
    }

    return 0;
  };

  const getLastColumn = (state: ReferenceSpreadsheetState) => {
    const columnCount = state.cells[0]?.length ?? 0;

    for (let columnIndex = columnCount - 1; columnIndex >= 0; columnIndex--) {
      for (const row of state.cells) {
        if (row[columnIndex] !== "") {
          return columnIndex + 1;
        }
      }
    }

    return 0;
  };

  const sheetService: RuntimeServicePort<"Sheet"> = {
    getLastRow: ({ spreadsheetId, sheetId }) => {
      const state = getInitialSheet(spreadsheetId, sheetId);

      return state === null ? null : getLastRow(state);
    },

    getLastColumn: ({ spreadsheetId, sheetId }) => {
      const state = getInitialSheet(spreadsheetId, sheetId);

      return state === null ? null : getLastColumn(state);
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

  const requireInitialSheet = (spreadsheetId: string, sheetId: number) => {
    const state = getInitialSheet(spreadsheetId, sheetId);

    if (!state) {
      throw new Error(`Sheet not found: ${sheetId}`);
    }

    return state;
  };

  const requestSheetLegacySync: RequestLegacySync = (request) => {
    const payload = request.payload as
      | {
          spreadsheetId?: unknown;
          sheetId?: unknown;
          sheetName?: unknown;
          rowPosition?: unknown;
          columnPosition?: unknown;
          howMany?: unknown;
        }
      | null
      | undefined;

    /*
     * Sheet#getRange("SheetName!A1") resolves the sheet by name.
     *
     * Unlike the mutation requests below, this request intentionally
     * contains sheetName instead of sheetId.
     */
    if (request.message === "Sheet#getRange") {
      if (
        payload === null ||
        payload === undefined ||
        typeof payload.spreadsheetId !== "string" ||
        typeof payload.sheetName !== "string"
      ) {
        throw new Error(`Invalid legacy Sheet payload for ${request.message}`);
      }

      if (!spreadsheets.has(payload.spreadsheetId) || payload.sheetName !== "Sheet1") {
        throw createReferenceGasException("Range not found");
      }

      return 0;
    }

    if (
      payload === null ||
      payload === undefined ||
      typeof payload.spreadsheetId !== "string" ||
      typeof payload.sheetId !== "number"
    ) {
      throw new Error(`Invalid legacy Sheet payload for ${request.message}`);
    }

    const state = requireInitialSheet(payload.spreadsheetId, payload.sheetId);

    const requirePosition = (value: unknown, name: "rowPosition" | "columnPosition") => {
      if (typeof value !== "number") {
        throw new Error(`Missing ${name} for ${request.message}`);
      }

      return value;
    };

    const requireHowMany = () => {
      if (typeof payload.howMany !== "number") {
        throw new Error(`Missing howMany for ${request.message}`);
      }

      return payload.howMany;
    };

    switch (request.message) {
      case "Sheet#clearContents": {
        for (const row of state.cells) {
          row.fill("");
        }

        return undefined;
      }

      case "Sheet#deleteRow": {
        const rowPosition = requirePosition(payload.rowPosition, "rowPosition");

        state.cells.splice(rowPosition - 1, 1);
        state.rows = state.cells.length;

        return undefined;
      }

      case "Sheet#deleteRows": {
        const rowPosition = requirePosition(payload.rowPosition, "rowPosition");

        state.cells.splice(rowPosition - 1, requireHowMany());
        state.rows = state.cells.length;

        return undefined;
      }

      case "Sheet#deleteColumn": {
        const columnPosition = requirePosition(payload.columnPosition, "columnPosition");

        for (const row of state.cells) {
          row.splice(columnPosition - 1, 1);
        }

        state.columns = state.cells[0]?.length ?? 0;

        return undefined;
      }

      case "Sheet#deleteColumns": {
        const columnPosition = requirePosition(payload.columnPosition, "columnPosition");

        const howMany = requireHowMany();

        for (const row of state.cells) {
          row.splice(columnPosition - 1, howMany);
        }

        state.columns = state.cells[0]?.length ?? 0;

        return undefined;
      }

      default:
        throw new Error(
          `Unexpected legacy Sheet request while executing reference case: ${request.message}`,
        );
    }
  };

  const rangeService: RuntimeServicePort<"Range"> = {
    getValue: ({ spreadsheetId, sheetId, range }) => {
      const state = requireInitialSheet(spreadsheetId, sheetId);

      return state.cells[range.row - 1][range.column - 1];
    },

    getValues: ({ spreadsheetId, sheetId, range }) => {
      const state = requireInitialSheet(spreadsheetId, sheetId);

      const rowStart = range.row - 1;
      const columnStart = range.column - 1;

      return state.cells
        .slice(rowStart, rowStart + range.numRows)
        .map((row) => row.slice(columnStart, columnStart + range.numColumns));
    },

    setValue: ({ spreadsheetId, sheetId, range, value }) => {
      const state = requireInitialSheet(spreadsheetId, sheetId);

      const rowStart = range.row - 1;
      const columnStart = range.column - 1;

      for (let rowOffset = 0; rowOffset < range.numRows; rowOffset++) {
        for (let columnOffset = 0; columnOffset < range.numColumns; columnOffset++) {
          state.cells[rowStart + rowOffset][columnStart + columnOffset] = value;
        }
      }
    },

    setValues: ({ spreadsheetId, sheetId, range, values }) => {
      if (values.length !== range.numRows) {
        throw createReferenceGasException(
          `The number of rows in the data does not match the number of rows in the range. ` +
            `The data has ${values.length} but the range has ${range.numRows}.`,
        );
      }

      const state = requireInitialSheet(spreadsheetId, sheetId);

      const rowStart = range.row - 1;
      const columnStart = range.column - 1;

      for (let rowOffset = 0; rowOffset < range.numRows; rowOffset++) {
        const rowValues = values[rowOffset];

        if (rowValues.length !== range.numColumns) {
          throw createReferenceGasException(
            `The number of columns in the data does not match the number of columns in the range. ` +
              `The data has ${rowValues.length} but the range has ${range.numColumns}.`,
          );
        }

        for (let columnOffset = 0; columnOffset < range.numColumns; columnOffset++) {
          state.cells[rowStart + rowOffset][columnStart + columnOffset] = rowValues[columnOffset];
        }
      }
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
    ) => new Range(targetSpreadsheetId, sheetId, row, column, numRows, numColumns, rangeService);

    const createSheet: CreateSheet = (targetSpreadsheetId, sheetId) =>
      new Sheet(targetSpreadsheetId, sheetId, createRange, sheetService, requestSheetLegacySync);

    return new Spreadsheet(spreadsheetId, createSheet);
  };

  const spreadsheetAppService: RuntimeServicePort<"SpreadsheetApp"> = {
    create: ({ rows, columns }) => {
      sequence += 1;

      const spreadsheetId = `reference-spreadsheet-${sequence}`;

      const cells = Array.from({ length: rows }, () => Array.from({ length: columns }, () => ""));

      spreadsheets.set(spreadsheetId, {
        rows,
        columns,
        cells,
      });

      return spreadsheetId;
    },

    openById: ({ id }) => {
      if (!spreadsheets.has(id)) {
        throw createReferenceGasException(`Illegal spreadsheet id or key: ${id}`);
      }

      return id;
    },
  };

  return {
    createSpreadsheet,
    spreadsheetAppService,
  };
}

function createReferenceContent(value: string): number[] {
  return Array.from(Buffer.from(value, "utf8"));
}

function createReferenceForm(body: unknown): Record<string, string[]> {
  if (typeof body !== "string") {
    return {};
  }

  const form: Record<string, string[]> = {};

  for (const [name, value] of new URLSearchParams(body)) {
    const values = form[name] ?? [];

    values.push(value);
    form[name] = values;
  }

  return form;
}

function createReferenceEchoHeaders(request: RuntimeFetchRequest): Record<string, unknown> {
  const headers: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(request.headers ?? {})) {
    const lowerName = name.toLowerCase();

    if (lowerName === "content-type" || lowerName === "x-vegas-header") {
      headers[name] = [value];
    }
  }

  return headers;
}

function getReferenceRequestContentType(request: RuntimeFetchRequest): string | null {
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    if (name.toLowerCase() === "content-type") {
      return value.split(";", 1)[0].trim().toLowerCase();
    }
  }

  return null;
}

function createReferenceFetchResponse(request: RuntimeFetchRequest): RuntimeFetchResponse {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/anything") {
    const body = typeof request.body === "string" ? request.body : "";

    const contentType = getReferenceRequestContentType(request);

    const payload = {
      method: (request.method ?? "get").toUpperCase(),

      data: body,

      form: contentType === "application/x-www-form-urlencoded" ? createReferenceForm(body) : {},

      headers: createReferenceEchoHeaders(request),
    };

    return {
      headers: {
        "Content-Type": "application/json",
      },
      content: createReferenceContent(JSON.stringify(payload)),
      responseCode: 200,
    };
  }

  if (pathname === "/redirect/1") {
    return {
      headers: {},
      content: [],
      responseCode: request.redirect === "manual" ? 302 : 200,
    };
  }

  if (pathname === "/status/404") {
    return {
      headers: {},
      content: [],
      responseCode: 404,
    };
  }

  if (pathname === "/base64/Y2Fmw6k=") {
    return {
      headers: {
        "Content-Type": "text/plain",
      },
      content: Array.from(Buffer.from("Y2Fmw6k=", "base64")),
      responseCode: 200,
    };
  }

  if (pathname === "/response-headers") {
    return {
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "x-vegas-header": "alpha",
      },
      content: [],
      responseCode: 200,
    };
  }

  /*
   * Existing HTTPResponse identity cases use example.com.
   * Keep their deterministic payload intact.
   */
  return {
    headers: {
      "Content-Type": "text/plain",
      "X-Vegas-Reference": "true",
    },
    content: createReferenceContent("vegas-reference-response"),
    responseCode: 200,
  };
}

export function createVegasReferenceExecutor(source: string): ReferenceExecutor {
  const referenceDependencies = createReferenceDependencies();

  return {
    async execute(functionName, parameters = []) {
      const htmlOutputFacadeFactory = createHtmlOutputFacadeFactory();

      let templateContext: ReturnType<typeof createScriptContext> | undefined;

      const evaluateHtmlTemplate: EvaluateHtmlTemplate = (templateCode, bindings) => {
        if (!templateContext) {
          throw new Error("Reference script context is not initialized");
        }

        return evaluateScriptWithBindings(templateCode, templateContext, bindings);
      };

      const context = createScriptContext({
        ...referenceDependencies,
        htmlOutputFacadeFactory,
        createHtmlOutput: (content: string, mode: GoogleAppsScript.HTML.XFrameOptionsMode) =>
          new HtmlOutput(content, mode),
        createHtmlTemplate: (content: string) => new HtmlTemplate(content, evaluateHtmlTemplate),
      });

      templateContext = context;

      evaluateScript(source, context);

      try {
        const completion = await invokeScriptFunction(context, functionName, [...parameters]);

        return completion.value;
      } catch (error) {
        throw projectVegasExecutionError(error, functionName);
      }
    },
  };
}
