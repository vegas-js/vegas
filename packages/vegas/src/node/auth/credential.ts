import { requireAppsScriptAuthProfile } from "./auth-profile";

export interface AppsScriptCredential {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly accessToken?: string;
  readonly expiryDate?: number;
  readonly scopes: readonly string[];
}

export interface AppsScriptCredentialFile {
  readonly version: 1;
  readonly profiles: Readonly<Record<string, AppsScriptCredential>>;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function requireString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Invalid Apps Script credential file.");
  }

  return value;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireString(value);
}

function optionalExpiryDate(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Invalid Apps Script credential file.");
  }

  return value;
}

function requireScopes(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Invalid Apps Script credential file.");
  }

  return value.map((scope) => requireString(scope));
}

function parseCredential(value: unknown): AppsScriptCredential {
  const credential = objectValue(value);
  if (!credential) {
    throw new Error("Invalid Apps Script credential file.");
  }

  const accessToken = optionalString(credential.accessToken);
  const expiryDate = optionalExpiryDate(credential.expiryDate);

  return {
    clientId: requireString(credential.clientId),
    clientSecret: requireString(credential.clientSecret),
    refreshToken: requireString(credential.refreshToken),
    ...(accessToken !== undefined ? { accessToken } : {}),
    ...(expiryDate !== undefined ? { expiryDate } : {}),
    scopes: requireScopes(credential.scopes),
  };
}

export function createAppsScriptCredentialFile(
  profiles: Readonly<Record<string, AppsScriptCredential>>,
): AppsScriptCredentialFile {
  return {
    version: 1,
    profiles,
  };
}

export function parseAppsScriptCredentialFile(content: string): AppsScriptCredentialFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid Apps Script credential file.");
  }

  const file = objectValue(parsed);
  if (!file) {
    throw new Error("Invalid Apps Script credential file.");
  }

  if (file.version !== 1) {
    if (typeof file.version === "number") {
      throw new Error(`Unsupported Apps Script credential file version: ${file.version}`);
    }

    throw new Error("Invalid Apps Script credential file.");
  }

  const profiles = objectValue(file.profiles);
  if (!profiles) {
    throw new Error("Invalid Apps Script credential file.");
  }

  const parsedProfiles = Object.fromEntries(
    Object.entries(profiles).map(([profile, credential]) => {
      requireAppsScriptAuthProfile(profile);

      return [profile, parseCredential(credential)];
    }),
  );

  return {
    version: 1,
    profiles: parsedProfiles,
  };
}
