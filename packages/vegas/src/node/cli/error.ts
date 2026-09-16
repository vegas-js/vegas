import { ConfigValidationError } from "../project/validate-config";

export function formatCliError(error: unknown): string | undefined {
  if (error instanceof ConfigValidationError) {
    return error.message;
  }

  return undefined;
}
