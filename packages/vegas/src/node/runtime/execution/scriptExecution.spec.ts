import { expect, test, vi } from "vitest";

import { HtmlOutput } from "../services/html/HtmlOutput";
import { createHtmlOutputFacadeFactory } from "../services/html/htmlOutputFacade";
import { invokeScriptFunction } from "./invocation";
import { createScriptContext, type ScriptContextDependencies } from "./scriptContext";
import { executeScriptInvocation } from "./scriptExecution";
import { evaluateScript } from "./scriptRuntime";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

function createContext(overrides: Partial<ScriptContextDependencies> = {}) {
  return createScriptContext({
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

    logSink: { write: unexpected },

    spreadsheetAppService: {
      create: unexpected,
      openById: unexpected,
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
    ...overrides,
  });
}

test("user code accessible to typed service", async () => {
  const context = createContext({
    sessionService: {
      getActiveUser: () => "active@example.com",
      getEffectiveUser: () => "effective@example.com",
      getActiveUserLocale: () => "ja",
      getScriptTimeZone: () => "Asia/Tokyo",
      getTemporaryActiveUserKey: () => "-- Active user key --",
    },
  });

  evaluateScript(
    `
    function execute(name) {
      return {
        name,
        email: Session.getActiveUser().getEmail(),
        locale: Session.getActiveUserLocale(),
        timeZone: Session.getScriptTimeZone(),
      };
    }`,
    context,
  );

  const { value: result } = await invokeScriptFunction(context, "execute", ["Vegas"]);

  const output = result as unknown;

  expect(output).toEqual({
    name: "Vegas",
    email: "active@example.com",
    locale: "ja",
    timeZone: "Asia/Tokyo",
  });
});

test("return a value from doGet to the actual GAS global", async () => {
  const htmlOutputFacadeFactory = createHtmlOutputFacadeFactory();

  const context = createContext({
    htmlOutputFacadeFactory,
    createHtmlOutput: (content: string, mode: GoogleAppsScript.HTML.XFrameOptionsMode) =>
      new HtmlOutput(content, mode),
  });

  evaluateScript(
    `
    function doGet() {
      return HtmlService
        .createHtmlOutput("<h1>Hello</h1>")
        .setTitle("Hello");
    }`,
    context,
  );

  const { value: result } = await invokeScriptFunction(context, "doGet", []);

  const output = result as GoogleAppsScript.HTML.HtmlOutput;

  expect(output.getTitle()).toBe("Hello");
  expect(output.getContent()).toBe("<h1>Hello</h1>");
});

test("return a value from doPost to the actual GAS global", async () => {
  const context = createContext({
    createHtmlOutput: (content: string, mode: GoogleAppsScript.HTML.XFrameOptionsMode) =>
      new HtmlOutput(content, mode),
  });

  evaluateScript(
    `
    function doPost(e) {
      return HtmlService.createHtmlOutput(
        e.postData.contents
      );
    }`,
    context,
  );

  const { value: result } = await invokeScriptFunction(context, "doPost", [
    {
      postData: {
        contents: "Hello from POST",
      },
    },
  ]);

  const output = result as GoogleAppsScript.HTML.HtmlOutput;

  expect(output.getContent()).toBe("Hello from POST");
});

test("user code reaches the injected sink", () => {
  const write = vi.fn();
  const context = createContext({
    logSink: { write },
  });

  evaluateScript(`console.log('from user script');`, context);

  const [_method, _prefix, value] = write.mock.lastCall ?? ["", "", ""];

  expect(write).toHaveBeenCalledOnce();
  expect(value).toBe("from user script");
});

test("orchestrates a fresh script execution for each invocation", async () => {
  const code = `
    let topLevelEvaluationCount = 0;
    topLevelEvaluationCount += 1;

    function observeExecution() {
      return topLevelEvaluationCount;
    }
  `;

  const createExecutionContext = vi.fn(() => createContext());

  const first = await executeScriptInvocation({
    code,
    functionName: "observeExecution",
    args: [],
    createContext: () => createExecutionContext(),
  });

  const second = await executeScriptInvocation({
    code,
    functionName: "observeExecution",
    args: [],
    createContext: () => createExecutionContext(),
  });

  expect(first.value).toBe(1);
  expect(second.value).toBe(1);

  expect(createExecutionContext).toHaveBeenCalledTimes(2);
});
