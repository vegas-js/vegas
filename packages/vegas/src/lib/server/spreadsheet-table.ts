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
import type { SpreadsheetStorageCodec } from "./spreadsheet-storage-codec";

export interface SpreadsheetTableOptions {
  readonly startRow?: number;
  readonly startColumn?: number;
  readonly storageCodec?: SpreadsheetStorageCodec;
}

export interface SpreadsheetTable<Row> {
  readAll(): Row[];
  query(expression: SpreadsheetQueryExpression): Row[];
  execute(query: SpreadsheetQueryPlan | SpreadsheetQueryPlanSource): Row[];
  append(row: Row): void;
  updateAt(index: number, row: Row): void;
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

function requireQueryPlan(plan: SpreadsheetQueryPlan, logicalWidth: number): void {
  if (plan.limit !== undefined && (!Number.isInteger(plan.limit) || plan.limit < 0)) {
    throw new RangeError("Spreadsheet query limit must be a non-negative integer.");
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
  options: SpreadsheetTableOptions = {},
): SpreadsheetTable<Row> {
  const startRow = requireTableCoordinate(options.startRow ?? 1, "startRow");
  const startColumn = requireTableCoordinate(options.startColumn ?? 1, "startColumn");
  const storageCodec = requireStorageCodecWidth(
    options.storageCodec ?? createDefaultStorageCodec(codec.width),
    codec.width,
  );

  function readPhysicalValues(): unknown[][] {
    const lastRow = sheet.getLastRow();

    if (lastRow < startRow) {
      return [];
    }

    const rowCount = lastRow - startRow + 1;
    return sheet.getRange(startRow, startColumn, rowCount, storageCodec.physicalWidth).getValues();
  }

  function readValues(): unknown[][] {
    return readPhysicalValues().map((row) => [...storageCodec.decode(row)]);
  }

  function executePlan(plan: SpreadsheetQueryPlan): Row[] {
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

    const selected = plan.limit === undefined ? candidates : candidates.slice(0, plan.limit);

    return selected.map((candidate) => codec.decode(candidate.values));
  }

  return {
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

    append(row): void {
      const values = [...storageCodec.encode(codec.encode(row))];
      const rowIndex = Math.max(sheet.getLastRow() + 1, startRow);

      sheet.getRange(rowIndex, startColumn, 1, storageCodec.physicalWidth).setValues([values]);
    },

    updateAt(index, row): void {
      const resolvedIndex = requireTableIndex(index);
      const rowIndex = startRow + resolvedIndex;

      if (rowIndex > sheet.getLastRow()) {
        throw new RangeError(`Spreadsheet table row index ${resolvedIndex} is out of range.`);
      }

      const values = [...storageCodec.encode(codec.encode(row))];

      sheet.getRange(rowIndex, startColumn, 1, storageCodec.physicalWidth).setValues([values]);
    },
  };
}
