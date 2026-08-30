import vm from "node:vm";
import worker from "node:worker_threads";

import { invokeFunction } from "./invocation";
import { createObjectFactories } from "./objectFactories";
import {
  createRangeService,
  createSessionService,
  createCacheService,
  createPropertiesService,
} from "./remoteServices";
import { createRuntimeServiceCaller } from "./runtimeTransport";
import { createScriptContext } from "./scriptContext";
import type { RequestLegacySync } from "./types";

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
const rangeService = createRangeService(callService);
const sessionService = createSessionService(callService);
const cacheService = createCacheService(callService);
const propertiesService = createPropertiesService(callService);

const { createFile, createFolder, createHtmlOutput, createHtmlTemplate, createSpreadsheet } =
  createObjectFactories(requestLegacySync, rangeService);

const script = new vm.Script(worker.workerData.code);
export const scriptContext = createScriptContext({
  requestLegacySync,
  createFile,
  createFolder,
  createHtmlOutput,
  createHtmlTemplate,
  createSpreadsheet,
  sessionService,
  cacheService,
  propertiesService,
});
script.runInContext(scriptContext);

port.on("message", async (data: GASWorkerData) => {
  const targetFn = scriptContext[data.fn];
  if (typeof targetFn !== "function") {
    throw new Error(`${data.fn} is not a function`);
  }

  const result = await invokeFunction(targetFn, ...data.args);
  port.postMessage({ message: "resolve", payload: result });
});

port.on("close", () => process.exit());
