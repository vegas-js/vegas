import worker from "node:worker_threads";

import { handleAppsScriptWorkerInvocation } from "./invocation";
import { createWorkerRuntimeContext, type RuntimeWorkerData } from "./runtime-context";

const runtimeWorkerData = worker.workerData as RuntimeWorkerData;
const port = runtimeWorkerData.port;
const scriptContext = createWorkerRuntimeContext(runtimeWorkerData);

port.on("message", async (data: unknown) => {
  await handleAppsScriptWorkerInvocation(port, scriptContext, data);
});
