import worker from "node:worker_threads";

import { executeRuntimeFunction } from "../runtime";
import {
  isAppsScriptWorkerRequest,
  serializeAppsScriptWorkerError,
  type AppsScriptWorkerResponse,
} from "../runtime/node/apps-script-worker-protocol";
import { createWorkerRuntimeContext, type RuntimeWorkerData } from "./runtime-context";

const runtimeWorkerData = worker.workerData as RuntimeWorkerData;
const port = runtimeWorkerData.port;
const scriptContext = createWorkerRuntimeContext(runtimeWorkerData);

port.on("message", async (data: unknown) => {
  if (!isAppsScriptWorkerRequest(data)) {
    const response: AppsScriptWorkerResponse = {
      type: "result",
      ok: false,
      error: serializeAppsScriptWorkerError(
        new Error("Invalid Apps Script worker invocation request."),
      ),
    };
    port.postMessage(response);
    return;
  }

  try {
    const value = await executeRuntimeFunction(scriptContext, data.functionName, data.args);
    const response: AppsScriptWorkerResponse = {
      type: "result",
      ok: true,
      value,
    };
    port.postMessage(response);
  } catch (error) {
    const response: AppsScriptWorkerResponse = {
      type: "result",
      ok: false,
      error: serializeAppsScriptWorkerError(error),
    };
    port.postMessage(response);
  }
});

port.on("close", () => process.exit());
