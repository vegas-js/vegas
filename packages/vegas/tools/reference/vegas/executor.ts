import { invokeScriptFunction } from "../../../src/node/runtime/execution/invocation";
import {
  createScriptContext,
  type ScriptContextDependencies,
} from "../../../src/node/runtime/execution/scriptContext";
import { evaluateScript } from "../../../src/node/runtime/execution/scriptRuntime";
import { RuntimeServicePort } from "../../../src/node/runtime/protocol";
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

function createReferenceDependencies(): ScriptContextDependencies {
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
      getActiveUser: () => "active@example.invalid",
      getEffectiveUser: () => "effective@example.invalid",
      getActiveUserLocale: () => "en",
      getScriptTimeZone: () => "Etc/UTC",
      getTemporaryActiveUserKey: () => "reference-user-key",
    },

    cacheService: {
      get: unexpected,
      getAll: unexpected,
      put: unexpected,
      putAll: unexpected,
      remove: unexpected,
      removeAll: unexpected,
    },

    propertiesService: createReferencePropertiesService(),
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
