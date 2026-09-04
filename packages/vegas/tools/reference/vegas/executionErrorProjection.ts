import { ScriptFunctionNotFoundError } from "../../../src/node/runtime/execution/entryResolution";
import { ReferenceExecutionError } from "../core/executionError";

export function projectVegasExecutionError(
  error: unknown,
  functionName: string,
): ReferenceExecutionError {
  if (error instanceof ScriptFunctionNotFoundError) {
    return new ReferenceExecutionError({
      statusCode: 3,
      statusMessage: error.message,
      errorMessage: error.message,
      errorType: "FUNCTION_NOT_FOUND",
      scriptStackTraceFunctions: [],
    });
  }

  const message = formatUserThrownValue(error);

  return new ReferenceExecutionError({
    statusCode: 3,
    statusMessage: message,
    errorMessage: message,
    errorType: "USER_ERROR",
    scriptStackTraceFunctions: [functionName],
  });
}

function formatUserThrownValue(value: unknown): string {
  if (value === null) {
    return "Uncaught null";
  }

  // oxlint-disable-next-line no-base-to-string
  return String(value);
}
