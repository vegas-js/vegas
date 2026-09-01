import { invokeScriptFunction } from "../../src/node/worker/invocation";
import {
  createScriptContext,
  type ScriptContextDependencies,
} from "../../src/node/worker/scriptContext";
import { evaluateScript } from "../../src/node/worker/scriptRuntime";
import type { ReferenceExecutor } from "./types";

function unexpected(): never {
  throw new Error("Unexpected dependency call while executing reference case");
}

function createReferenceDependencies(): ScriptContextDependencies {
  return {
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

export function createVegasReferenceExecutor(source: string): ReferenceExecutor {
  const context = createScriptContext(createReferenceDependencies());

  evaluateScript(source, context);

  return {
    execute(functionName) {
      return invokeScriptFunction(context, functionName, []);
    },
  };
}
