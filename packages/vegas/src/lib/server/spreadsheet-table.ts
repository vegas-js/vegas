import { compareSpreadsheetQueryValues } from "./spreadsheet-query-comparison";
import { matchesSpreadsheetQuery } from "./spreadsheet-query-executor";
import type { SpreadsheetQueryExpression } from "./spreadsheet-query-ir";
import type {
  SpreadsheetOrderBy,
  SpreadsheetQueryPlan,
  SpreadsheetQueryPlanSource,
} from "./spreadsheet-query-plan";
import { evaluateSpreadsheetQueryPushdown } from "./spreadsheet-query-pushdown";
import type { SpreadsheetRowCodec } from "./spreadsheet-row-codec";
import type { SpreadsheetSchema, SpreadsheetSchemaColumnSource } from "./spreadsheet-schema";
import type { SpreadsheetStorageCodec } from "./spreadsheet-storage-codec";

export interface SpreadsheetTableOptions {
  readonly startRow?: number;
  readonly startColumn?: number;
  readonly storageCodec?: SpreadsheetStorageCodec;
}

export interface SpreadsheetTableEntry<Row> {
  readonly index: number;
  readonly row: Row;
}

export interface SpreadsheetTable<Row> {
  readAll(): Row[];
  query(expression: SpreadsheetQueryExpression): Row[];
  execute(query: SpreadsheetQueryPlan | SpreadsheetQueryPlanSource): Row[];
  executeEntries(
    query: SpreadsheetQueryPlan | SpreadsheetQueryPlanSource,
  ): SpreadsheetTableEntry<Row>[];
  append(row: Row): void;
  updateAt(index: number, row: Row): void;
  deleteAt(index: number): void;
}

const spreadsheetTableMaterializedIndexLookup = Symbol("spreadsheetTableMaterializedIndexLookup");
const spreadsheetTableKnownIndexRead = Symbol("spreadsheetTableKnownIndexRead");
const spreadsheetTableKnownIndexUpdate = Symbol("spreadsheetTableKnownIndexUpdate");

interface SpreadsheetTableWithMaterializedIndexLookup<Row> extends SpreadsheetTable<Row> {
  [spreadsheetTableMaterializedIndexLookup](
    logicalIndex: number,
    value: unknown,
    limit: number,
  ): number[] | undefined;
}

interface SpreadsheetTableWithKnownIndexRead<Row> extends SpreadsheetTable<Row> {
  [spreadsheetTableKnownIndexRead](index: number): SpreadsheetTableEntry<Row>;
}

interface SpreadsheetTableWithKnownIndexUpdate<Row> extends SpreadsheetTable<Row> {
  [spreadsheetTableKnownIndexUpdate](index: number, row: Row): void;
}

export function tryFindSpreadsheetTableIndicesByMaterializedColumn<Row>(
  table: SpreadsheetTable<Row>,
  logicalIndex: number,
  value: unknown,
  limit: number,
): number[] | undefined {
  const lookup = (table as Partial<SpreadsheetTableWithMaterializedIndexLookup<Row>>)[
    spreadsheetTableMaterializedIndexLookup
  ];

  return lookup?.(logicalIndex, value, limit);
}

export function tryReadSpreadsheetTableEntryAtKnownIndex<Row>(
  table: SpreadsheetTable<Row>,
  index: number,
): SpreadsheetTableEntry<Row> | undefined {
  const read = (table as Partial<SpreadsheetTableWithKnownIndexRead<Row>>)[
    spreadsheetTableKnownIndexRead
  ];

  return read?.(index);
}

export function tryUpdateSpreadsheetTableAtKnownIndex<Row>(
  table: SpreadsheetTable<Row>,
  index: number,
  row: Row,
): boolean {
  const update = (table as Partial<SpreadsheetTableWithKnownIndexUpdate<Row>>)[
    spreadsheetTableKnownIndexUpdate
  ];

  if (update === undefined) {
    return false;
  }

  update(index, row);
  return true;
}

function requireTableCoordinate(value: number, name: "startRow" | "startColumn"): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`Spreadsheet table ${name} must be a positive integer.`);
  }

  return value;
}

function requireTableIndex(index: number): number {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError("Spreadsheet table row index must be a non-negative integer.");
  }

  return index;
}

function createDefaultStorageCodec(width: number): SpreadsheetStorageCodec {
  return {
    logicalWidth: width,
    physicalWidth: width,
    locate(logicalIndex) {
      return {
        kind: "materialized",
        physicalIndex: logicalIndex,
      };
    },
    encode(values): readonly unknown[] {
      return [...values];
    },
    decode(values): readonly unknown[] {
      return [...values];
    },
  };
}

function resolveQueryPlan(
  query: SpreadsheetQueryPlan | SpreadsheetQueryPlanSource,
): SpreadsheetQueryPlan {
  return "toPlan" in query ? query.toPlan() : query;
}

function requireQueryExpression(
  expression: SpreadsheetQueryExpression,
  logicalWidth: number,
): void {
  switch (expression.kind) {
    case "equal":
    case "not-equal":
    case "less-than":
    case "less-than-or-equal":
    case "greater-than":
    case "greater-than-or-equal":
      if (
        !Number.isInteger(expression.column) ||
        expression.column < 0 ||
        expression.column >= logicalWidth
      ) {
        throw new RangeError(
          `Spreadsheet query filter column index ${expression.column} must be between 0 and ${logicalWidth - 1}.`,
        );
      }

      return;
    case "and":
    case "or":
      if (expression.expressions.length === 0) {
        throw new RangeError(`Spreadsheet query ${expression.kind} expression must not be empty.`);
      }

      for (const candidate of expression.expressions) {
        requireQueryExpression(candidate, logicalWidth);
      }
  }
}

function requireQueryPlan(plan: SpreadsheetQueryPlan, logicalWidth: number): void {
  if (plan.limit !== undefined && (!Number.isInteger(plan.limit) || plan.limit < 0)) {
    throw new RangeError("Spreadsheet query limit must be a non-negative integer.");
  }

  if (plan.where !== undefined) {
    requireQueryExpression(plan.where, logicalWidth);
  }

  for (const orderBy of plan.orderBy) {
    if (!Number.isInteger(orderBy.column) || orderBy.column < 0 || orderBy.column >= logicalWidth) {
      throw new RangeError(
        `Spreadsheet query order column index ${orderBy.column} must be between 0 and ${logicalWidth - 1}.`,
      );
    }

    if (orderBy.direction !== "asc" && orderBy.direction !== "desc") {
      throw new RangeError(
        `Spreadsheet query sort direction "${String(orderBy.direction)}" must be "asc" or "desc".`,
      );
    }
  }
}

interface SpreadsheetQueryCandidate {
  readonly values: readonly unknown[];
  readonly sourceIndex: number;
}

function compareQueryCandidates(
  left: SpreadsheetQueryCandidate,
  right: SpreadsheetQueryCandidate,
  orderBy: readonly SpreadsheetOrderBy[],
): number {
  for (const order of orderBy) {
    const comparison = compareSpreadsheetQueryValues(
      left.values[order.column],
      right.values[order.column],
      "Spreadsheet query order values must be comparable.",
    );

    if (comparison !== 0) {
      return order.direction === "asc" ? comparison : -comparison;
    }
  }

  return left.sourceIndex - right.sourceIndex;
}

function isSpreadsheetSchema<Row>(
  source: SpreadsheetRowCodec<Row> | SpreadsheetSchema<Row, SpreadsheetSchemaColumnSource<Row>>,
): source is SpreadsheetSchema<Row, SpreadsheetSchemaColumnSource<Row>> {
  return "codec" in source && "columnList" in source && "getColumn" in source;
}

function requireStorageCodecWidth(
  storageCodec: SpreadsheetStorageCodec,
  logicalWidth: number,
): SpreadsheetStorageCodec {
  if (storageCodec.logicalWidth !== logicalWidth) {
    throw new RangeError(
      `Spreadsheet table storage codec logical width ${storageCodec.logicalWidth} must match row codec width ${logicalWidth}.`,
    );
  }

  return storageCodec;
}

export function createSpreadsheetTable<Row>(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  codec: SpreadsheetRowCodec<Row>,
  options?: SpreadsheetTableOptions,
): SpreadsheetTable<Row>;
export function createSpreadsheetTable<Row, Columns extends SpreadsheetSchemaColumnSource<Row>>(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  schema: SpreadsheetSchema<Row, Columns>,
  options?: SpreadsheetTableOptions,
): SpreadsheetTable<Row>;
export function createSpreadsheetTable<Row>(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  source: SpreadsheetRowCodec<Row> | SpreadsheetSchema<Row, SpreadsheetSchemaColumnSource<Row>>,
  options: SpreadsheetTableOptions = {},
): SpreadsheetTable<Row> {
  const codec = isSpreadsheetSchema(source) ? source.codec : source;
  const startRow = requireTableCoordinate(options.startRow ?? 1, "startRow");
  const startColumn = requireTableCoordinate(options.startColumn ?? 1, "startColumn");
  const storageCodec = requireStorageCodecWidth(
    options.storageCodec ?? createDefaultStorageCodec(codec.width),
    codec.width,
  );

  function readPhysicalValuesFrom(sourceIndex: number): unknown[][] {
    const rowIndex = startRow + sourceIndex;
    const lastSheetRow = sheet.getLastRow();

    if (lastSheetRow < rowIndex) {
      return [];
    }

    const candidateRowCount = lastSheetRow - rowIndex + 1;
    const values = sheet
      .getRange(rowIndex, startColumn, candidateRowCount, storageCodec.physicalWidth)
      .getValues();
    let tableRowCount = values.length;

    // Vegas tables treat trailing rows whose physical cells are all empty strings as outside the table.
    while (tableRowCount > 0) {
      const physicalRow = values[tableRowCount - 1];

      if (physicalRow === undefined || !physicalRow.every((value) => value === "")) {
        break;
      }

      tableRowCount -= 1;
    }

    return values.slice(0, tableRowCount);
  }

  function readPhysicalValues(): unknown[][] {
    return readPhysicalValuesFrom(0);
  }

  function readValues(): unknown[][] {
    return readPhysicalValues().map((row) => [...storageCodec.decode(row)]);
  }

  function findIndicesByMaterializedColumn(
    logicalIndex: number,
    value: unknown,
    limit: number,
  ): number[] | undefined {
    const location = storageCodec.locate(logicalIndex);

    if (location.kind !== "materialized" || Object.is(value, "")) {
      return undefined;
    }

    if (limit === 0) {
      return [];
    }

    const lastSheetRow = sheet.getLastRow();

    if (lastSheetRow < startRow) {
      return [];
    }

    const candidateRowCount = lastSheetRow - startRow + 1;
    const materializedValues = sheet
      .getRange(startRow, startColumn + location.physicalIndex, candidateRowCount, 1)
      .getValues();
    const indices: number[] = [];

    for (let sourceIndex = 0; sourceIndex < materializedValues.length; sourceIndex += 1) {
      const materializedRow = materializedValues[sourceIndex];

      if (materializedRow === undefined || !Object.is(materializedRow[0], value)) {
        continue;
      }

      // Vegas table boundaries trim only trailing rows whose physical cells are all empty
      // strings. A non-empty materialized equality match therefore cannot be outside the table.
      indices.push(sourceIndex);

      if (indices.length === limit) {
        break;
      }
    }

    return indices;
  }

  function readKnownIndex(index: number): SpreadsheetTableEntry<Row> {
    const sourceIndex = requireTableIndex(index);
    const physicalValues = sheet
      .getRange(startRow + sourceIndex, startColumn, 1, storageCodec.physicalWidth)
      .getValues()[0]!;

    return {
      index: sourceIndex,
      row: codec.decode(storageCodec.decode(physicalValues)),
    };
  }

  function updateKnownIndex(index: number, row: Row): void {
    const resolvedIndex = requireTableIndex(index);
    const values = [...storageCodec.encode(codec.encode(row))];
    const rowIndex = startRow + resolvedIndex;

    sheet.getRange(rowIndex, startColumn, 1, storageCodec.physicalWidth).setValues([values]);
  }

  function selectQueryCandidates(plan: SpreadsheetQueryPlan): SpreadsheetQueryCandidate[] {
    requireQueryPlan(plan, codec.width);

    if (plan.limit === 0) {
      return [];
    }

    const candidates: SpreadsheetQueryCandidate[] = [];
    const canStopAtLimit = plan.orderBy.length === 0 && plan.limit !== undefined;
    let sourceIndex = 0;

    for (const physicalValues of readPhysicalValues()) {
      if (plan.where !== undefined) {
        const pushdown = evaluateSpreadsheetQueryPushdown(
          physicalValues,
          plan.where,
          (logicalIndex) => storageCodec.locate(logicalIndex),
        );

        if (pushdown === "miss") {
          sourceIndex += 1;
          continue;
        }

        const logicalValues = [...storageCodec.decode(physicalValues)];

        if (pushdown === "unknown" && !matchesSpreadsheetQuery(logicalValues, plan.where)) {
          sourceIndex += 1;
          continue;
        }

        candidates.push({
          values: logicalValues,
          sourceIndex,
        });
      } else {
        candidates.push({
          values: [...storageCodec.decode(physicalValues)],
          sourceIndex,
        });
      }

      sourceIndex += 1;

      if (canStopAtLimit && candidates.length === plan.limit) {
        break;
      }
    }

    if (plan.orderBy.length > 0) {
      candidates.sort((left, right) => compareQueryCandidates(left, right, plan.orderBy));
    }

    return plan.limit === undefined ? candidates : candidates.slice(0, plan.limit);
  }

  function executePlanEntries(plan: SpreadsheetQueryPlan): SpreadsheetTableEntry<Row>[] {
    return selectQueryCandidates(plan).map((candidate) => ({
      index: candidate.sourceIndex,
      row: codec.decode(candidate.values),
    }));
  }

  function executePlan(plan: SpreadsheetQueryPlan): Row[] {
    return executePlanEntries(plan).map((entry) => entry.row);
  }

  const table: SpreadsheetTableWithMaterializedIndexLookup<Row> &
    SpreadsheetTableWithKnownIndexRead<Row> &
    SpreadsheetTableWithKnownIndexUpdate<Row> = {
    readAll(): Row[] {
      return readValues().map((row) => codec.decode(row));
    },

    query(expression): Row[] {
      return executePlan({
        where: expression,
        orderBy: [],
      });
    },

    execute(query): Row[] {
      return executePlan(resolveQueryPlan(query));
    },

    executeEntries(query): SpreadsheetTableEntry<Row>[] {
      return executePlanEntries(resolveQueryPlan(query));
    },

    [spreadsheetTableMaterializedIndexLookup](logicalIndex, value, limit) {
      return findIndicesByMaterializedColumn(logicalIndex, value, limit);
    },

    [spreadsheetTableKnownIndexRead](index) {
      return readKnownIndex(index);
    },

    [spreadsheetTableKnownIndexUpdate](index, row): void {
      updateKnownIndex(index, row);
    },

    append(row): void {
      const values = [...storageCodec.encode(codec.encode(row))];
      const rowIndex = startRow + readPhysicalValues().length;

      sheet.getRange(rowIndex, startColumn, 1, storageCodec.physicalWidth).setValues([values]);
    },

    updateAt(index, row): void {
      const resolvedIndex = requireTableIndex(index);
      const rowCount = readPhysicalValues().length;

      if (resolvedIndex >= rowCount) {
        throw new RangeError(`Spreadsheet table row index ${resolvedIndex} is out of range.`);
      }

      updateKnownIndex(resolvedIndex, row);
    },

    deleteAt(index): void {
      const resolvedIndex = requireTableIndex(index);
      const physicalValues = readPhysicalValuesFrom(resolvedIndex);

      if (physicalValues.length === 0) {
        throw new RangeError(`Spreadsheet table row index ${resolvedIndex} is out of range.`);
      }

      const shiftedValues = physicalValues.slice(1).map((row) => [...row]);
      shiftedValues.push(Array.from({ length: storageCodec.physicalWidth }, () => ""));

      // Vegas table deletion shifts only the table's physical cells so adjacent sheet data stays fixed.
      sheet
        .getRange(
          startRow + resolvedIndex,
          startColumn,
          physicalValues.length,
          storageCodec.physicalWidth,
        )
        .setValues(shiftedValues);
    },
  };

  return table;
}
