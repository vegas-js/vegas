import { executeRuntimeFunction, RuntimeInfrastructureError } from "../runtime";
import {
  parseAppsScriptWorkerRequest,
  serializeAppsScriptWorkerError,
  type AppsScriptWorkerResponse,
} from "../runtime/node/apps-script-worker-protocol";

interface AppsScriptWorkerPort {
  postMessage(value: AppsScriptWorkerResponse): void;
  close(): void;
}

export function postAppsScriptWorkerError(port: AppsScriptWorkerPort, error: unknown): void {
  postAppsScriptWorkerResponse(port, {
    type: "result",
    ok: false,
    error: serializeAppsScriptWorkerError(error),
  });
}

export async function handleAppsScriptWorkerInvocation(
  port: AppsScriptWorkerPort,
  scriptContext: Readonly<Record<string, unknown>>,
  data: unknown,
): Promise<void> {
  let response: AppsScriptWorkerResponse;

  const invocation = parseAppsScriptWorkerRequest(data);
  if (invocation === undefined) {
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
        value: await executeRuntimeFunction(
          scriptContext,
          invocation.functionName,
          invocation.args,
        ),
      };
    } catch (error) {
      response = {
        type: "result",
        ok: false,
        error: serializeAppsScriptWorkerError(error),
      };
    }
  }

  postAppsScriptWorkerResponse(port, response);
}

function postAppsScriptWorkerResponse(
  port: AppsScriptWorkerPort,
  response: AppsScriptWorkerResponse,
): void {
  try {
    try {
      port.postMessage(response);
    } catch (error) {
      if (!response.ok) {
        throw error;
      }

      port.postMessage({
        type: "result",
        ok: false,
        error: serializeAppsScriptWorkerError(
          new RuntimeInfrastructureError(
            "serialization",
            "Apps Script worker result could not be serialized.",
            { cause: error },
          ),
        ),
      });
    }
  } finally {
    port.close();
  }
}
