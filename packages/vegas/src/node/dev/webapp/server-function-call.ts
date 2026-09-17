import type {
  ServerFunctionCallRequest,
  ServerFunctionCallResponse,
} from "../../../shared/webapp-protocol";
import type { Executor, InvocationEnvironment } from "../../runtime";

export async function executeServerFunctionCall(
  executor: Executor,
  request: ServerFunctionCallRequest,
  environment: InvocationEnvironment,
): Promise<ServerFunctionCallResponse> {
  try {
    const result = await executor.execute({
      functionName: request.functionName,
      args: request.args,
      environment,
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
