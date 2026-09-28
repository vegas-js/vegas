import type { SpreadsheetColumn, SpreadsheetSchema } from "./spreadsheet-schema";

export type SpreadsheetStorageMode = "columns" | "packed" | "indexed-packed";

export type SpreadsheetStorageLocation =
  | {
      readonly kind: "materialized";
      readonly physicalIndex: number;
    }
  | {
      readonly kind: "payload";
      readonly physicalIndex: number;
      readonly payloadIndex: number;
    };

export type SpreadsheetStorageLayoutOptions<Row> =
  | {
      readonly mode: "columns";
    }
  | {
      readonly mode: "packed";
      readonly key: SpreadsheetColumn<Row, unknown>;
    }
  | {
      readonly mode: "indexed-packed";
      readonly key: SpreadsheetColumn<Row, unknown>;
      readonly materialize: readonly SpreadsheetColumn<Row, unknown>[];
    };

export interface SpreadsheetStorageLayout {
  readonly mode: SpreadsheetStorageMode;
  readonly physicalWidth: number;
  locate(logicalIndex: number): SpreadsheetStorageLocation;
}

function requireLogicalIndex(index: number, width: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= width) {
    throw new RangeError(
      `Spreadsheet storage logical column index ${index} must be between 0 and ${width - 1}.`,
    );
  }

  return index;
}

function requireSchemaColumn<Row>(
  schema: SpreadsheetSchema<Row>,
  column: SpreadsheetColumn<Row, unknown>,
  role: "key" | "materialized",
): number {
  const matchesSchema = schema.columns.some(
    (candidate) => candidate.index === column.index && candidate.name === column.name,
  );

  if (!matchesSchema) {
    throw new RangeError(
      `Spreadsheet storage ${role} column "${column.name}" must belong to the schema.`,
    );
  }

  return column.index;
}

function createColumnLocations(width: number): readonly SpreadsheetStorageLocation[] {
  return Array.from({ length: width }, (_, physicalIndex) => ({
    kind: "materialized" as const,
    physicalIndex,
  }));
}

function createPackedLocations<Row>(
  schema: SpreadsheetSchema<Row>,
  key: SpreadsheetColumn<Row, unknown>,
  materialized: readonly SpreadsheetColumn<Row, unknown>[],
): {
  readonly locations: readonly SpreadsheetStorageLocation[];
  readonly physicalWidth: number;
} {
  const keyIndex = requireSchemaColumn(schema, key, "key");
  const materializedIndices = new Set<number>([keyIndex]);
  const physicalIndices = new Map<number, number>([[keyIndex, 0]]);

  for (const column of materialized) {
    const logicalIndex = requireSchemaColumn(schema, column, "materialized");

    if (materializedIndices.has(logicalIndex)) {
      throw new RangeError(
        `Spreadsheet storage logical column index ${logicalIndex} must not be materialized more than once.`,
      );
    }

    materializedIndices.add(logicalIndex);
    physicalIndices.set(logicalIndex, physicalIndices.size);
  }

  const payloadPhysicalIndex = physicalIndices.size;
  let payloadIndex = 0;
  const locations = Array.from(
    { length: schema.codec.width },
    (_, logicalIndex): SpreadsheetStorageLocation => {
      const physicalIndex = physicalIndices.get(logicalIndex);

      if (physicalIndex !== undefined) {
        return {
          kind: "materialized",
          physicalIndex,
        };
      }

      const location: SpreadsheetStorageLocation = {
        kind: "payload",
        physicalIndex: payloadPhysicalIndex,
        payloadIndex,
      };
      payloadIndex += 1;
      return location;
    },
  );

  if (payloadIndex === 0) {
    throw new RangeError(
      "Spreadsheet packed storage must leave at least one column in the payload.",
    );
  }

  return {
    locations,
    physicalWidth: payloadPhysicalIndex + 1,
  };
}

export function createSpreadsheetStorageLayout<Row>(
  schema: SpreadsheetSchema<Row>,
  options: SpreadsheetStorageLayoutOptions<Row>,
): SpreadsheetStorageLayout {
  if (options.mode === "columns") {
    const locations = createColumnLocations(schema.codec.width);

    return {
      mode: options.mode,
      physicalWidth: schema.codec.width,
      locate(logicalIndex): SpreadsheetStorageLocation {
        return locations[requireLogicalIndex(logicalIndex, schema.codec.width)]!;
      },
    };
  }

  const packed = createPackedLocations(
    schema,
    options.key,
    options.mode === "indexed-packed" ? options.materialize : [],
  );

  return {
    mode: options.mode,
    physicalWidth: packed.physicalWidth,
    locate(logicalIndex): SpreadsheetStorageLocation {
      return packed.locations[requireLogicalIndex(logicalIndex, schema.codec.width)]!;
    },
  };
}
