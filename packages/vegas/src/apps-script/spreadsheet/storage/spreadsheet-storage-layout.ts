import type {
  SpreadsheetColumn,
  SpreadsheetSchema,
  SpreadsheetSchemaColumnSource,
} from "../spreadsheet-schema";

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
  readonly logicalWidth: number;
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

function requireSchemaColumn<Row, Columns extends SpreadsheetSchemaColumnSource<Row>>(
  schema: SpreadsheetSchema<Row, Columns>,
  column: SpreadsheetColumn<Row, unknown>,
  role: "key" | "materialized",
): number {
  const matchesSchema = schema.columnList.some(
    (candidate) => candidate.index === column.index && candidate.name === column.name,
  );

  if (!matchesSchema) {
    throw new RangeError(
      `Spreadsheet storage ${role} column "${column.name}" must belong to the schema.`,
    );
  }

  return column.index;
}

function copyStorageLocation(location: SpreadsheetStorageLocation): SpreadsheetStorageLocation {
  return location.kind === "materialized"
    ? {
        kind: location.kind,
        physicalIndex: location.physicalIndex,
      }
    : {
        kind: location.kind,
        physicalIndex: location.physicalIndex,
        payloadIndex: location.payloadIndex,
      };
}

function createColumnLocations(width: number): readonly SpreadsheetStorageLocation[] {
  return Array.from({ length: width }, (_, physicalIndex) => ({
    kind: "materialized" as const,
    physicalIndex,
  }));
}

function createPackedLocations<Row, Columns extends SpreadsheetSchemaColumnSource<Row>>(
  schema: SpreadsheetSchema<Row, Columns>,
  logicalWidth: number,
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
    { length: logicalWidth },
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

export function createSpreadsheetStorageLayout<
  Row,
  Columns extends SpreadsheetSchemaColumnSource<Row>,
>(
  schema: SpreadsheetSchema<Row, Columns>,
  options: SpreadsheetStorageLayoutOptions<Row>,
): SpreadsheetStorageLayout {
  const logicalWidth = schema.codec.width;

  if (options.mode === "columns") {
    const locations = createColumnLocations(logicalWidth);

    return {
      mode: options.mode,
      logicalWidth,
      physicalWidth: logicalWidth,
      locate(logicalIndex): SpreadsheetStorageLocation {
        return copyStorageLocation(locations[requireLogicalIndex(logicalIndex, logicalWidth)]!);
      },
    };
  }

  const packed = createPackedLocations(
    schema,
    logicalWidth,
    options.key,
    options.mode === "indexed-packed" ? options.materialize : [],
  );

  return {
    mode: options.mode,
    logicalWidth,
    physicalWidth: packed.physicalWidth,
    locate(logicalIndex): SpreadsheetStorageLocation {
      return copyStorageLocation(
        packed.locations[requireLogicalIndex(logicalIndex, logicalWidth)]!,
      );
    },
  };
}
