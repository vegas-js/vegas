import type {
  ServerFunctionCallRequest,
  ServerFunctionCallResponse,
} from "../../../../webapp/server-function-protocol";
import type { RuntimeBackend } from "../../../runtime";

export async function executeServerFunctionCall(
  runtime: RuntimeBackend,
  request: ServerFunctionCallRequest,
  signal?: AbortSignal,
): Promise<ServerFunctionCallResponse> {
  if (request.functionName.endsWith("_")) {
    return {
      requestId: request.requestId,
      status: "err",
      message: `Server function "${request.functionName}" is private and cannot be called by google.script.run.`,
    };
  }

  try {
    const result = await runtime.execute({
      functionName: request.functionName,
      args: request.args,
      ...(signal === undefined ? {} : { signal }),
    });

    return {
      requestId: request.requestId,
      status: "ok",
      result,
    };
  } catch (error) {
    return {
      requestId: request.requestId,
      status: "err",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
