import { executeRuntimeFunction } from "../runtime";
import {
  isAppsScriptWorkerRequest,
  serializeAppsScriptWorkerError,
  type AppsScriptWorkerResponse,
} from "../runtime/node/apps-script-worker-protocol";

interface AppsScriptWorkerPort {
  postMessage(value: AppsScriptWorkerResponse): void;
  close(): void;
}

export async function handleAppsScriptWorkerInvocation(
  port: AppsScriptWorkerPort,
  scriptContext: Readonly<Record<string, unknown>>,
  data: unknown,
): Promise<void> {
  let response: AppsScriptWorkerResponse;

  if (!isAppsScriptWorkerRequest(data)) {
    response = {
      type: "result",
      ok: false,
      error: serializeAppsScriptWorkerError(
        new Error("Invalid Apps Script worker invocation request."),
      ),
    };
  } else {
    try {
      response = {
        type: "result",
        ok: true,
        value: await executeRuntimeFunction(scriptContext, data.functionName, data.args),
      };
    } catch (error) {
      response = {
        type: "result",
        ok: false,
        error: serializeAppsScriptWorkerError(error),
      };
    }
  }

  try {
    port.postMessage(response);
  } finally {
    port.close();
  }
}
