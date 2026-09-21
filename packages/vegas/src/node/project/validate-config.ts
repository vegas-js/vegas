import type { AppsScriptManifest, UserConfig } from "../../shared/config";

type UnknownRecord = Record<string, unknown>;
type AppsScriptWebAppConfig = NonNullable<AppsScriptManifest["webapp"]>;

const CONFIG_KEYS = [
  "root",
  "clientDir",
  "serverDir",
  "runtimeDataDir",
  "plugins",
  "appType",
  "devServer",
  "output",
  "appsScript",
] as const;

const DEV_SERVER_KEYS = ["host", "port", "open"] as const;
const OUTPUT_KEYS = ["dir", "allowOutsideRoot"] as const;
const APPS_SCRIPT_KEYS = ["scriptId", "manifest"] as const;
const MANIFEST_KEYS = [
  "dependencies",
  "exceptionLogging",
  "oauthScopes",
  "runtimeVersion",
  "timeZone",
  "urlFetchWhitelist",
  "webapp",
] as const;
const DEPENDENCIES_KEYS = ["enabledAdvancedServices", "libraries"] as const;
const ENABLED_ADVANCED_SERVICE_KEYS = ["serviceId", "userSymbol", "version"] as const;
const LIBRARY_KEYS = ["developmentMode", "libraryId", "userSymbol", "version"] as const;
const WEB_APP_KEYS = ["access", "executeAs"] as const;

const APP_TYPES = ["spa", "script"] as const satisfies readonly NonNullable<
  UserConfig["appType"]
>[];
const EXCEPTION_LOGGING_VALUES = ["NONE", "STACKDRIVER"] as const satisfies readonly NonNullable<
  AppsScriptManifest["exceptionLogging"]
>[];
const RUNTIME_VERSION_VALUES = [
  "STABLE",
  "V8",
  "DEPRECATED_ES5",
] as const satisfies readonly NonNullable<AppsScriptManifest["runtimeVersion"]>[];
const WEB_APP_ACCESS_VALUES = [
  "MYSELF",
  "DOMAIN",
  "ANYONE",
  "ANYONE_ANONYMOUS",
] as const satisfies readonly NonNullable<AppsScriptWebAppConfig["access"]>[];
const WEB_APP_EXECUTE_AS_VALUES = [
  "USER_ACCESSING",
  "USER_DEPLOYING",
] as const satisfies readonly NonNullable<AppsScriptWebAppConfig["executeAs"]>[];

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

function assertOptionalNonEmptyString(value: unknown, path: string): void {
  assertOptionalString(value, path);

  if (typeof value === "string" && value.trim().length === 0) {
    throw new ConfigValidationError(`"${path}" must not be empty.`);
  }
}

function assertOptionalBoolean(value: unknown, path: string): void {
  if (value !== undefined && typeof value !== "boolean") {
    throw new ConfigValidationError(`"${path}" must be a boolean.`);
  }
}

function assertOptionalStringOrBoolean(value: unknown, path: string): void {
  if (value !== undefined && typeof value !== "string" && typeof value !== "boolean") {
    throw new ConfigValidationError(`"${path}" must be a string or boolean.`);
  }
}

function assertOptionalPort(value: unknown, path: string): void {
  if (
    value !== undefined &&
    (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 65535)
  ) {
    throw new ConfigValidationError(`"${path}" must be an integer between 0 and 65535.`);
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

function validateOptionalRecord(
  value: unknown,
  path: string,
  allowedKeys: readonly string[],
  validateFields: (value: UnknownRecord, path: string) => void,
): void {
  if (value === undefined) {
    return;
  }

  assertRecord(value, path);
  assertNoUnknownKeys(value, allowedKeys, path);
  validateFields(value, path);
}

function validateOptionalRecordArray(
  value: unknown,
  path: string,
  allowedKeys: readonly string[],
  validateFields: (value: UnknownRecord, path: string) => void,
): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    throw new ConfigValidationError(`"${path}" must be an array.`);
  }

  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;

    assertRecord(item, itemPath);
    assertNoUnknownKeys(item, allowedKeys, itemPath);
    validateFields(item, itemPath);
  });
}

function validateDevServer(value: unknown): void {
  validateOptionalRecord(value, "devServer", DEV_SERVER_KEYS, (devServer, path) => {
    assertOptionalStringOrBoolean(devServer.host, `${path}.host`);
    assertOptionalPort(devServer.port, `${path}.port`);
    assertOptionalBoolean(devServer.open, `${path}.open`);
  });
}

function validateOutput(value: unknown): void {
  validateOptionalRecord(value, "output", OUTPUT_KEYS, (output, path) => {
    assertOptionalString(output.dir, `${path}.dir`);
    assertOptionalBoolean(output.allowOutsideRoot, `${path}.allowOutsideRoot`);
  });
}

function validateEnabledAdvancedServices(value: unknown, path: string): void {
  validateOptionalRecordArray(value, path, ENABLED_ADVANCED_SERVICE_KEYS, (service, itemPath) => {
    assertOptionalString(service.serviceId, `${itemPath}.serviceId`);
    assertOptionalString(service.userSymbol, `${itemPath}.userSymbol`);
    assertOptionalString(service.version, `${itemPath}.version`);
  });
}

function validateLibraries(value: unknown, path: string): void {
  validateOptionalRecordArray(value, path, LIBRARY_KEYS, (library, itemPath) => {
    assertOptionalBoolean(library.developmentMode, `${itemPath}.developmentMode`);
    assertOptionalString(library.libraryId, `${itemPath}.libraryId`);
    assertOptionalString(library.userSymbol, `${itemPath}.userSymbol`);
    assertOptionalString(library.version, `${itemPath}.version`);
  });
}

function validateDependencies(value: unknown, path: string): void {
  validateOptionalRecord(value, path, DEPENDENCIES_KEYS, (dependencies, dependenciesPath) => {
    validateEnabledAdvancedServices(
      dependencies.enabledAdvancedServices,
      `${dependenciesPath}.enabledAdvancedServices`,
    );
    validateLibraries(dependencies.libraries, `${dependenciesPath}.libraries`);
  });
}

function validateWebApp(value: unknown, path: string): void {
  validateOptionalRecord(value, path, WEB_APP_KEYS, (webApp, webAppPath) => {
    assertOptionalEnum(webApp.access, WEB_APP_ACCESS_VALUES, `${webAppPath}.access`);
    assertOptionalEnum(webApp.executeAs, WEB_APP_EXECUTE_AS_VALUES, `${webAppPath}.executeAs`);
  });
}

function validateManifest(value: unknown, path: string): void {
  validateOptionalRecord(value, path, MANIFEST_KEYS, (manifest, manifestPath) => {
    validateDependencies(manifest.dependencies, `${manifestPath}.dependencies`);
    assertOptionalEnum(
      manifest.exceptionLogging,
      EXCEPTION_LOGGING_VALUES,
      `${manifestPath}.exceptionLogging`,
    );
    assertOptionalStringArray(manifest.oauthScopes, `${manifestPath}.oauthScopes`);
    assertOptionalEnum(
      manifest.runtimeVersion,
      RUNTIME_VERSION_VALUES,
      `${manifestPath}.runtimeVersion`,
    );
    assertOptionalString(manifest.timeZone, `${manifestPath}.timeZone`);
    assertOptionalStringArray(manifest.urlFetchWhitelist, `${manifestPath}.urlFetchWhitelist`);
    validateWebApp(manifest.webapp, `${manifestPath}.webapp`);
  });
}

function validateAppsScript(value: unknown): void {
  validateOptionalRecord(value, "appsScript", APPS_SCRIPT_KEYS, (appsScript, path) => {
    assertOptionalString(appsScript.scriptId, `${path}.scriptId`);
    validateManifest(appsScript.manifest, `${path}.manifest`);
  });
}

export function validateUserConfig(value: unknown): UserConfig {
  assertRecord(value, "config");
  assertNoUnknownKeys(value, CONFIG_KEYS);

  assertOptionalString(value.root, "root");
  assertOptionalNonEmptyString(value.clientDir, "clientDir");
  assertOptionalNonEmptyString(value.serverDir, "serverDir");
  assertOptionalNonEmptyString(value.runtimeDataDir, "runtimeDataDir");

  if (value.plugins !== undefined && !Array.isArray(value.plugins)) {
    throw new ConfigValidationError('"plugins" must be an array.');
  }

  assertOptionalEnum(value.appType, APP_TYPES, "appType");
  validateDevServer(value.devServer);
  validateOutput(value.output);
  validateAppsScript(value.appsScript);

  return value as UserConfig;
}
