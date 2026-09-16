import type { UserConfig } from "../../shared/config";

type UnknownRecord = Record<string, unknown>;

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(`Invalid Vegas config: ${message}`);
    this.name = "ConfigValidationError";
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function assertRecord(value: unknown, path: string): asserts value is UnknownRecord {
  if (!isRecord(value)) {
    throw new ConfigValidationError(`"${path}" must be an object.`);
  }
}

function assertNoUnknownKeys(
  value: UnknownRecord,
  allowedKeys: readonly string[],
  path?: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      const option = path ? `${path}.${key}` : key;
      throw new ConfigValidationError(`unknown option "${option}".`);
    }
  }
}

function assertOptionalString(value: unknown, path: string): void {
  if (value !== undefined && typeof value !== "string") {
    throw new ConfigValidationError(`"${path}" must be a string.`);
  }
}

function assertOptionalBoolean(value: unknown, path: string): void {
  if (value !== undefined && typeof value !== "boolean") {
    throw new ConfigValidationError(`"${path}" must be a boolean.`);
  }
}

function assertOptionalStringArray(value: unknown, path: string): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    throw new ConfigValidationError(`"${path}" must be an array.`);
  }

  value.forEach((item, index) => {
    if (typeof item !== "string") {
      throw new ConfigValidationError(`"${path}[${index}]" must be a string.`);
    }
  });
}

function assertOptionalEnum(value: unknown, allowedValues: readonly string[], path: string): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string" || !allowedValues.includes(value)) {
    throw new ConfigValidationError(
      `"${path}" must be one of ${allowedValues.map((item) => `"${item}"`).join(", ")}.`,
    );
  }
}

function validateOutput(value: unknown): void {
  if (value === undefined) {
    return;
  }

  assertRecord(value, "output");
  assertNoUnknownKeys(value, ["dir"], "output");
  assertOptionalString(value.dir, "output.dir");
}

function validateEnabledAdvancedServices(value: unknown): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    throw new ConfigValidationError(
      '"appsScript.manifest.dependencies.enabledAdvancedServices" must be an array.',
    );
  }

  value.forEach((service, index) => {
    const path = `appsScript.manifest.dependencies.enabledAdvancedServices[${index}]`;

    assertRecord(service, path);
    assertNoUnknownKeys(service, ["serviceId", "userSymbol", "version"], path);

    assertOptionalString(service.serviceId, `${path}.serviceId`);
    assertOptionalString(service.userSymbol, `${path}.userSymbol`);
    assertOptionalString(service.version, `${path}.version`);
  });
}

function validateLibraries(value: unknown): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    throw new ConfigValidationError(
      '"appsScript.manifest.dependencies.libraries" must be an array.',
    );
  }

  value.forEach((library, index) => {
    const path = `appsScript.manifest.dependencies.libraries[${index}]`;

    assertRecord(library, path);
    assertNoUnknownKeys(library, ["developmentMode", "libraryId", "userSymbol", "version"], path);

    assertOptionalBoolean(library.developmentMode, `${path}.developmentMode`);
    assertOptionalString(library.libraryId, `${path}.libraryId`);
    assertOptionalString(library.userSymbol, `${path}.userSymbol`);
    assertOptionalString(library.version, `${path}.version`);
  });
}

function validateDependencies(value: unknown): void {
  if (value === undefined) {
    return;
  }

  assertRecord(value, "appsScript.manifest.dependencies");
  assertNoUnknownKeys(
    value,
    ["enabledAdvancedServices", "libraries"],
    "appsScript.manifest.dependencies",
  );

  validateEnabledAdvancedServices(value.enabledAdvancedServices);
  validateLibraries(value.libraries);
}

function validateWebApp(value: unknown): void {
  if (value === undefined) {
    return;
  }

  assertRecord(value, "appsScript.manifest.webapp");
  assertNoUnknownKeys(value, ["access", "executeAs"], "appsScript.manifest.webapp");

  assertOptionalEnum(
    value.access,
    ["MYSELF", "DOMAIN", "ANYONE", "ANYONE_ANONYMOUS"],
    "appsScript.manifest.webapp.access",
  );

  assertOptionalEnum(
    value.executeAs,
    ["USER_ACCESSING", "USER_DEPLOYING"],
    "appsScript.manifest.webapp.executeAs",
  );
}

function validateManifest(value: unknown): void {
  if (value === undefined) {
    return;
  }

  assertRecord(value, "appsScript.manifest");
  assertNoUnknownKeys(
    value,
    ["dependencies", "exceptionLogging", "oauthScopes", "runtimeVersion", "timeZone", "webapp"],
    "appsScript.manifest",
  );

  validateDependencies(value.dependencies);

  assertOptionalEnum(
    value.exceptionLogging,
    ["NONE", "STACKDRIVER"],
    "appsScript.manifest.exceptionLogging",
  );

  assertOptionalStringArray(value.oauthScopes, "appsScript.manifest.oauthScopes");

  assertOptionalEnum(
    value.runtimeVersion,
    ["STABLE", "V8", "DEPRECATED_ES5"],
    "appsScript.manifest.runtimeVersion",
  );

  assertOptionalString(value.timeZone, "appsScript.manifest.timeZone");

  validateWebApp(value.webapp);
}

function validateAppsScript(value: unknown): void {
  if (value === undefined) {
    return;
  }

  assertRecord(value, "appsScript");
  assertNoUnknownKeys(value, ["scriptId", "manifest"], "appsScript");

  assertOptionalString(value.scriptId, "appsScript.scriptId");
  validateManifest(value.manifest);
}

export function validateUserConfig(value: unknown): UserConfig {
  assertRecord(value, "config");

  assertNoUnknownKeys(value, [
    "root",
    "clientDir",
    "serverDir",
    "runtimeDataDir",
    "plugins",
    "appType",
    "output",
    "appsScript",
  ]);

  assertOptionalString(value.root, "root");
  assertOptionalString(value.clientDir, "clientDir");
  assertOptionalString(value.serverDir, "serverDir");
  assertOptionalString(value.runtimeDataDir, "runtimeDataDir");

  if (value.plugins !== undefined && !Array.isArray(value.plugins)) {
    throw new ConfigValidationError('"plugins" must be an array.');
  }

  assertOptionalEnum(value.appType, ["spa", "script"], "appType");

  validateOutput(value.output);
  validateAppsScript(value.appsScript);

  return value as UserConfig;
}
