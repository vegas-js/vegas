import worker from "node:worker_threads";

import type { RuntimeGlobalEnvironment } from "../runtime/environment";
import { createScriptRuntime } from "../runtime/execution/bootstrap";
import type { RequestLegacySync } from "../runtime/legacy/transport";
import type { RuntimeLogSink } from "../runtime/logging";
import { createRuntimeServiceCaller } from "./runtimeTransport";

type RuntimeWorkerData = {
  code: string;
  sharedArray: Int32Array;
  port: worker.MessagePort;
  environment: RuntimeGlobalEnvironment;
};

type GASWorkerData = {
  fn: string;
  args: any[];
};

const workerData = worker.workerData as RuntimeWorkerData;

const sharedArray = workerData.sharedArray;
const port = workerData.port;

const requestLegacySync: RequestLegacySync = (request, timeout) => {
  Atomics.store(sharedArray, 0, 1);
  port.postMessage(request);
  Atomics.wait(sharedArray, 0, 1, timeout);
  const received = worker.receiveMessageOnPort(port);

  return received?.message ?? null;
};

const callService = createRuntimeServiceCaller(sharedArray, port);

const logSink: RuntimeLogSink = {
  write(method, prefix, message) {
    globalThis.console[method](prefix, message);
  },
};

const runtime = createScriptRuntime({
  code: workerData.code,
  environment: workerData.environment,
  requestLegacySync,
  logSink,
  callService,
});

port.on("message", async (data: GASWorkerData) => {
  const result = await runtime.invoke(data.fn, data.args);
  port.postMessage({ message: "resolve", payload: result });
});

port.on("close", () => process.exit());
