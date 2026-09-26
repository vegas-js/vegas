import * as z from "zod";

import type {
  RuntimeDataProperties,
  RuntimeDataSession,
  RuntimeDataSpreadsheet,
} from "../shared/gas";
import { RuntimeDataTarget } from "../shared/gas";

const propertiesSchema = z.strictObject({
  documentProperties: z.record(z.string(), z.string()).optional(),
  scriptProperties: z.record(z.string(), z.string()).optional(),
  userProperties: z.record(z.string(), z.string()).optional(),
});

const sessionSchema = z.strictObject({
  activeUserEmail: z.string().optional(),
  activeUserLocale: z.string().optional(),
  effectiveUserEmail: z.string().optional(),
  temporaryActiveUserKey: z.string().optional(),
});

const spreadsheetCellValueSchema = z.union([z.string(), z.number(), z.boolean(), z.date()]);

const spreadsheetSheetSchema = z
  .strictObject({
    id: z.number().int(),
    name: z.string(),
    maxRows: z.number().int().positive(),
    maxColumns: z.number().int().positive(),
    values: z.array(z.array(spreadsheetCellValueSchema)).optional(),
  })
  .superRefine((sheet, context) => {
    if (sheet.values === undefined) {
      return;
    }

    const columnCount = sheet.values.reduce((max, row) => Math.max(max, row.length), 0);

    if (sheet.values.length > sheet.maxRows) {
      context.addIssue({
        code: "custom",
        path: ["values"],
        message: "Sheet row count exceeds maxRows.",
      });
    }

    if (columnCount > sheet.maxColumns) {
      context.addIssue({
        code: "custom",
        path: ["values"],
        message: "Sheet column count exceeds maxColumns.",
      });
    }

    if (sheet.values.some((row) => row.length !== columnCount)) {
      context.addIssue({
        code: "custom",
        path: ["values"],
        message: "Sheet values must be rectangular.",
      });
    }
  });

const spreadsheetSchema = z.strictObject({
  id: z.string(),
  url: z.string().optional(),
  name: z.string(),
  sheets: z.array(spreadsheetSheetSchema),
});

const fixtureSchema = z.strictObject({
  properties: z.unknown().optional(),
  session: z.unknown().optional(),
  spreadsheets: z.array(z.unknown()).optional(),
});

export interface RuntimeDataFixture {
  readonly properties?: RuntimeDataProperties;
  readonly session?: RuntimeDataSession;
  readonly spreadsheets?: readonly RuntimeDataSpreadsheet[];
}

export type ValidatedRuntimeDataModule =
  | {
      readonly target: RuntimeDataTarget.Properties;
      readonly value: RuntimeDataProperties;
    }
  | {
      readonly target: RuntimeDataTarget.Session;
      readonly value: RuntimeDataSession;
    }
  | {
      readonly target: RuntimeDataTarget.Spreadsheet;
      readonly value: RuntimeDataSpreadsheet;
    };

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

function parseRuntimeData<T>(
  schema: z.ZodType<T>,
  value: unknown,
  source: string,
  rootLocation = "module",
): T {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  const issue = result.error.issues[0];
  const path = formatPath(issue.path);
  const location = path.length === 0 ? rootLocation : path;

  throw new Error(`Invalid runtime data in ${source}: ${location}: ${issue.message}`);
}

function validateRuntimeDataValue(
  target: RuntimeDataTarget.Properties,
  value: unknown,
  source: string,
): RuntimeDataProperties;
function validateRuntimeDataValue(
  target: RuntimeDataTarget.Session,
  value: unknown,
  source: string,
): RuntimeDataSession;
function validateRuntimeDataValue(
  target: RuntimeDataTarget.Spreadsheet,
  value: unknown,
  source: string,
): RuntimeDataSpreadsheet;
function validateRuntimeDataValue(
  target: RuntimeDataTarget,
  value: unknown,
  source: string,
): RuntimeDataProperties | RuntimeDataSession | RuntimeDataSpreadsheet {
  switch (target) {
    case RuntimeDataTarget.Properties:
      return parseRuntimeData(propertiesSchema, value, source);
    case RuntimeDataTarget.Session:
      return parseRuntimeData(sessionSchema, value, source);
    case RuntimeDataTarget.Spreadsheet:
      return parseRuntimeData(spreadsheetSchema, value, source);
    case RuntimeDataTarget.Cache:
      throw new Error(`Runtime data target Cache is not implemented: ${source}`);
  }
}

export function validateRuntimeDataFixture(value: unknown): RuntimeDataFixture {
  const fixture = parseRuntimeData(fixtureSchema, value, "inline fixture", "fixture");
  const properties =
    fixture.properties === undefined
      ? undefined
      : validateRuntimeDataValue(
          RuntimeDataTarget.Properties,
          fixture.properties,
          "inline:properties",
        );
  const session =
    fixture.session === undefined
      ? undefined
      : validateRuntimeDataValue(RuntimeDataTarget.Session, fixture.session, "inline:session");
  const spreadsheets = (fixture.spreadsheets ?? []).map((spreadsheet, index) =>
    validateRuntimeDataValue(
      RuntimeDataTarget.Spreadsheet,
      spreadsheet,
      `inline:spreadsheets[${index}]`,
    ),
  );

  return {
    ...(properties === undefined ? {} : { properties }),
    ...(session === undefined ? {} : { session }),
    spreadsheets,
  };
}

export function validateRuntimeDataModule(
  value: unknown,
  source: string,
): ValidatedRuntimeDataModule {
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("target" in value)) {
    throw new Error(`Runtime data module must export a target: ${source}`);
  }

  const { target, ...data } = value;

  switch (target) {
    case RuntimeDataTarget.Properties:
      return {
        target,
        value: validateRuntimeDataValue(target, data, source),
      };
    case RuntimeDataTarget.Session:
      return {
        target,
        value: validateRuntimeDataValue(target, data, source),
      };
    case RuntimeDataTarget.Spreadsheet:
      return {
        target,
        value: validateRuntimeDataValue(target, data, source),
      };
    case RuntimeDataTarget.Cache:
      throw new Error(`Runtime data target Cache is not implemented: ${source}`);
    default:
      throw new Error(`Unsupported runtime data target in ${source}: ${String(target)}`);
  }
}
