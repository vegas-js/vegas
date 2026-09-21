import type { PluginOption } from "vite";
import * as z from "zod";

const pluginOptionSchema = z.custom<PluginOption>();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

const plainObjectSchema = z.custom<Record<string, unknown>>(isPlainObject, {
  error: "must be an object.",
});

function strictPlainObject<const Shape extends z.core.$ZodShape>(shape: Shape) {
  return plainObjectSchema.pipe(z.strictObject(shape));
}

const nonEmptyStringSchema = z.string().refine((value) => value.trim().length > 0, {
  error: "must not be empty.",
});

const stringOrBooleanSchema = z.custom<string | boolean>(
  (value) => typeof value === "string" || typeof value === "boolean",
  {
    error: "must be a string or boolean.",
  },
);

const portSchema = z.custom<number>(
  (value) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 65535,
  {
    error: "must be an integer between 0 and 65535.",
  },
);

const enabledAdvancedServiceSchema = strictPlainObject({
  serviceId: z.string().optional(),
  userSymbol: z.string().optional(),
  version: z.string().optional(),
});

const librarySchema = strictPlainObject({
  developmentMode: z.boolean().optional(),
  libraryId: z.string().optional(),
  userSymbol: z.string().optional(),
  version: z.string().optional(),
});

const dependenciesSchema = strictPlainObject({
  enabledAdvancedServices: z.array(enabledAdvancedServiceSchema).optional(),
  libraries: z.array(librarySchema).optional(),
});

const appsScriptAccessSchema = z.enum(["MYSELF", "DOMAIN", "ANYONE", "ANYONE_ANONYMOUS"]);

const executionApiSchema = strictPlainObject({
  access: appsScriptAccessSchema.optional(),
});

const macroSchema = strictPlainObject({
  defaultShortcut: z.string().optional(),
  functionName: z.string(),
  menuName: z.string(),
});

const sheetsSchema = strictPlainObject({
  macros: z.array(macroSchema),
});

const webAppSchema = strictPlainObject({
  access: appsScriptAccessSchema.optional(),
  executeAs: z.enum(["USER_ACCESSING", "USER_DEPLOYING"]).optional(),
});

const manifestSchema = strictPlainObject({
  dependencies: dependenciesSchema.optional(),
  exceptionLogging: z.enum(["NONE", "STACKDRIVER"]).optional(),
  executionApi: executionApiSchema.optional(),
  oauthScopes: z.array(z.string()).optional(),
  runtimeVersion: z.enum(["STABLE", "V8", "DEPRECATED_ES5"]).optional(),
  sheets: sheetsSchema.optional(),
  timeZone: z.string().optional(),
  urlFetchWhitelist: z.array(z.string()).optional(),
  webapp: webAppSchema.optional(),
});

const appsScriptSchema = strictPlainObject({
  scriptId: z.string().optional(),
  manifest: manifestSchema.optional(),
});

const devServerSchema = strictPlainObject({
  host: stringOrBooleanSchema.optional(),
  port: portSchema.optional(),
  open: z.boolean().optional(),
});

const outputSchema = strictPlainObject({
  dir: z.string().optional(),
  allowOutsideRoot: z.boolean().optional(),
});

export const userConfigSchema = strictPlainObject({
  root: z.string().optional(),
  clientDir: nonEmptyStringSchema.optional(),
  serverDir: nonEmptyStringSchema.optional(),
  runtimeDataDir: nonEmptyStringSchema.optional(),
  plugins: z.array(pluginOptionSchema).optional(),
  appType: z.enum(["spa", "script"]).optional(),
  devServer: devServerSchema.optional(),
  output: outputSchema.optional(),
  appsScript: appsScriptSchema.optional(),
});

export type UserConfigSchemaOutput = z.output<typeof userConfigSchema>;
