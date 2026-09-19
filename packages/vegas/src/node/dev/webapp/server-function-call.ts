import type {
  ServerFunctionCallRequest,
  ServerFunctionCallResponse,
} from "../../../shared/webapp-protocol";
import type { RuntimeBackend } from "../../runtime";

export async function executeServerFunctionCall(
  runtime: RuntimeBackend,
  request: ServerFunctionCallRequest,
): Promise<ServerFunctionCallResponse> {
  try {
    const result = await runtime.execute({
      functionName: request.functionName,
      args: request.args,
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
