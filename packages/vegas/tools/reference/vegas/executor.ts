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
import { RuntimeServicePort } from "../../../src/node/runtime/protocol";
import { HtmlOutput } from "../../../src/node/runtime/services/html/HtmlOutput";
import { createHtmlOutputFacadeFactory } from "../../../src/node/runtime/services/html/htmlOutputFacade";
import { HtmlTemplate } from "../../../src/node/runtime/services/html/HtmlTemplate";
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
