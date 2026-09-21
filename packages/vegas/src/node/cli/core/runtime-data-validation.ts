import * as z from "zod";

import { RuntimeDataTarget } from "../../../shared/gas";

const propertiesSchema = z.strictObject({
  target: z.literal(RuntimeDataTarget.Properties),
  documentProperties: z.record(z.string(), z.string()).optional(),
  scriptProperties: z.record(z.string(), z.string()).optional(),
  userProperties: z.record(z.string(), z.string()).optional(),
});

const sessionSchema = z.strictObject({
  target: z.literal(RuntimeDataTarget.Session),
  activeUserEmail: z.string().optional(),
  activeUserLocale: z.string().optional(),
  effectiveUserEmail: z.string().optional(),
  temporaryActiveUserKey: z.string().optional(),
});

const spreadsheetCellValueSchema = z.union([z.string(), z.number(), z.boolean(), z.date()]);

const spreadsheetSheetSchema = z.strictObject({
  id: z.number().int(),
  name: z.string(),
  maxRows: z.number().int().positive(),
  maxColumns: z.number().int().positive(),
  values: z.array(z.array(spreadsheetCellValueSchema)).optional(),
});

const spreadsheetSchema = z.strictObject({
  target: z.literal(RuntimeDataTarget.Spreadsheet),
  id: z.string(),
  url: z.string().optional(),
  name: z.string(),
  sheets: z.array(spreadsheetSheetSchema),
});

export type RuntimeDataModule =
  | z.output<typeof propertiesSchema>
  | z.output<typeof sessionSchema>
  | z.output<typeof spreadsheetSchema>;

function formatPath(path: PropertyKey[]): string {
  let formatted = "";

  for (const segment of path) {
    if (typeof segment === "number") {
      formatted += `[${segment}]`;
    } else {
      formatted += formatted.length === 0 ? String(segment) : `.${String(segment)}`;
    }
  }

  return formatted;
}

function parseRuntimeData<T>(schema: z.ZodType<T>, value: unknown, source: string): T {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  const issue = result.error.issues[0];
  const path = formatPath(issue.path);
  const location = path.length === 0 ? "module" : path;

  throw new Error(`Invalid runtime data in ${source}: ${location}: ${issue.message}`);
}

export function validateRuntimeDataModule(value: unknown, source: string): RuntimeDataModule {
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("target" in value)) {
    throw new Error(`Runtime data module must export a target: ${source}`);
  }

  switch (value.target) {
    case RuntimeDataTarget.Properties:
      return parseRuntimeData(propertiesSchema, value, source);
    case RuntimeDataTarget.Session:
      return parseRuntimeData(sessionSchema, value, source);
    case RuntimeDataTarget.Spreadsheet:
      return parseRuntimeData(spreadsheetSchema, value, source);
    case RuntimeDataTarget.Cache:
      throw new Error(`Runtime data target Cache is not implemented: ${source}`);
    default:
      throw new Error(`Unsupported runtime data target in ${source}: ${String(value.target)}`);
  }
}
