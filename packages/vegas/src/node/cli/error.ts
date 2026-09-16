import { ConfigValidationError } from "../project/validate-config";

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

function isCacError(error: unknown): error is Error {
  return error instanceof Error && error.name === "CACError";
}

export function formatCliError(error: unknown): string | undefined {
  if (
    error instanceof ConfigValidationError ||
    error instanceof CliUsageError ||
    isCacError(error)
  ) {
    return error.message;
  }

  return undefined;
}
