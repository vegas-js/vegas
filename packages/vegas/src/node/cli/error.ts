import { AppsScriptAuthPrerequisiteError } from "../auth";
import { AppsScriptRemoteServiceError } from "../infrastructure/google/apps-script-remote-service-error";
import { ConfigValidationError } from "../project";
import { AppsScriptPushPrerequisiteError } from "../push";

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
    error instanceof AppsScriptAuthPrerequisiteError ||
    error instanceof AppsScriptPushPrerequisiteError ||
    error instanceof AppsScriptRemoteServiceError ||
    isCacError(error)
  ) {
    return error.message;
  }

  return undefined;
}
