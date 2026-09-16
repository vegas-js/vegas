import { AppsScriptAuthPrerequisiteError } from "./error";

export interface GoogleOAuthDesktopClient {
  readonly clientId: string;
  readonly clientSecret: string;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function requireString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppsScriptAuthPrerequisiteError(
      "Invalid Google OAuth desktop client file. Use a Desktop app OAuth client JSON.",
    );
  }

  return value;
}

export function parseGoogleOAuthDesktopClient(content: string): GoogleOAuthDesktopClient {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AppsScriptAuthPrerequisiteError(
      "Invalid Google OAuth desktop client file. Use a Desktop app OAuth client JSON.",
    );
  }

  const root = objectValue(parsed);
  const installed = objectValue(root?.installed);

  if (!installed) {
    throw new AppsScriptAuthPrerequisiteError(
      "Invalid Google OAuth desktop client file. Use a Desktop app OAuth client JSON.",
    );
  }

  return {
    clientId: requireString(installed.client_id),
    clientSecret: requireString(installed.client_secret),
  };
}
