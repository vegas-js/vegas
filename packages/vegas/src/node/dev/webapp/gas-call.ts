import type { WebAppGasCallRequest, WebAppGasCallResponse } from "../../../shared/webapp-protocol";
import type { GasExecutor } from "../../runtime";

export async function executeGasCall(
  executor: GasExecutor,
  request: WebAppGasCallRequest,
): Promise<WebAppGasCallResponse> {
  try {
    const result = await executor.execute({
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
