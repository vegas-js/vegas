import worker from "node:worker_threads";

import type { RuntimeLogSink } from "../runtime/logging";
import { invokeScriptFunction } from "./invocation";
import { createObjectFactories } from "./objectFactories";
import {
  createRangeService,
  createSessionService,
  createCacheService,
  createPropertiesService,
  createUrlFetchService,
  createHtmlService,
  createSpreadsheetAppService,
  createSheetService,
} from "./remoteServices";
import { createRuntimeServiceCaller } from "./runtimeTransport";
import { createScriptContext } from "./scriptContext";
import { evaluateScript, evaluateScriptWithBindings } from "./scriptRuntime";
import type { EvaluateHtmlTemplate, RequestLegacySync } from "./types";

const sharedArray: Int32Array = worker.workerData.sharedArray;
const port: worker.MessagePort = worker.workerData.port;

type GASWorkerData = {
  fn: string;
  args: any[];
};

const requestLegacySync: RequestLegacySync = (request, timeout) => {
  Atomics.store(sharedArray, 0, 1);
  port.postMessage(request);
  Atomics.wait(sharedArray, 0, 1, timeout);
  const received = worker.receiveMessageOnPort(port);

  return received?.message ?? null;
};

const callService = createRuntimeServiceCaller(sharedArray, port);
const spreadsheetAppService = createSpreadsheetAppService(callService);
const rangeService = createRangeService(callService);
const sheetService = createSheetService(callService);
const urlFetchService = createUrlFetchService(callService);
const htmlService = createHtmlService(callService);
const sessionService = createSessionService(callService);
const cacheService = createCacheService(callService);
const propertiesService = createPropertiesService(callService);

let scriptContext: ReturnType<typeof createScriptContext> | undefined;
const evaluateHtmlTemplate: EvaluateHtmlTemplate = (code, bindings) => {
  if (!scriptContext) {
    throw new Error("Script context is not initialized");
  }

  return evaluateScriptWithBindings(code, scriptContext, bindings);
};

const logSink: RuntimeLogSink = {
  write(method, prefix, message) {
    globalThis.console[method](prefix, message);
  },
};

const factories = createObjectFactories(
  requestLegacySync,
  rangeService,
  sheetService,
  evaluateHtmlTemplate,
);
scriptContext = createScriptContext({
  requestLegacySync,
  logSink,
  spreadsheetAppService,

  urlFetchService,
  htmlService,
  sessionService,
  cacheService,
  propertiesService,
  ...factories,
});

evaluateScript(worker.workerData.code, scriptContext);

port.on("message", async (data: GASWorkerData) => {
  const result = await invokeScriptFunction(scriptContext, data.fn, data.args);
  port.postMessage({ message: "resolve", payload: result });
});

port.on("close", () => process.exit());
