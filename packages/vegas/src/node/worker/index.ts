import worker from "node:worker_threads";

import { executeRuntimeFunction } from "../runtime";
import { createWorkerRuntimeContext, type RuntimeWorkerData } from "./runtime-context";

type GASWorkerData = {
  readonly fn: string;
  readonly args: readonly unknown[];
};

const runtimeWorkerData = worker.workerData as RuntimeWorkerData;
const port = runtimeWorkerData.port;
const scriptContext = createWorkerRuntimeContext(runtimeWorkerData);

port.on("message", async (data: GASWorkerData) => {
  const result = await executeRuntimeFunction(scriptContext, data.fn, data.args);
  port.postMessage({ message: "resolve", payload: result });
});

port.on("close", () => process.exit());
