import worker from "node:worker_threads";

import { handleAppsScriptWorkerInvocation, postAppsScriptWorkerError } from "./invocation";
import {
  createWorkerRuntimeContext,
  evaluateWorkerProgram,
  type RuntimeWorkerData,
} from "./runtime-context";

const runtimeWorkerData = worker.workerData as RuntimeWorkerData;
const port = runtimeWorkerData.port;

function startWorker(): void {
  const scriptContext = createWorkerRuntimeContext(runtimeWorkerData);

  try {
    evaluateWorkerProgram(scriptContext, runtimeWorkerData.program.source);
  } catch (error) {
    // Vegas treats failures while compiling or evaluating the supplied program as script errors.
    // Failures while constructing the VM/runtime globals still escape through the Worker itself.
    postAppsScriptWorkerError(port, error);
    return;
  }

  port.on("message", async (data: unknown) => {
    await handleAppsScriptWorkerInvocation(port, scriptContext, data);
  });
}

startWorker();
