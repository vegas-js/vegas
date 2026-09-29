import type { SpreadsheetSchema, SpreadsheetSchemaColumnSource } from "./spreadsheet-schema";
import {
  createSpreadsheetStorageLayout,
  type SpreadsheetStorageLayout,
  type SpreadsheetStorageLayoutOptions,
  type SpreadsheetStorageLocation,
} from "./spreadsheet-storage-layout";

export interface SpreadsheetStorageCodec {
  readonly logicalWidth: number;
  readonly physicalWidth: number;
  locate(logicalIndex: number): SpreadsheetStorageLocation;
  encode(values: readonly unknown[]): readonly unknown[];
  decode(values: readonly unknown[]): readonly unknown[];
}

function requireStorageWidth(
  values: readonly unknown[],
  width: number,
  kind: "logical" | "physical",
): readonly unknown[] {
  if (values.length !== width) {
    throw new RangeError(
      `Spreadsheet storage codec expected ${width} ${kind} values, received ${values.length}.`,
    );
  }

  return values;
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireJsonCompatible(value: unknown, logicalIndex: number, seen: Set<object>): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0))
  ) {
    return;
  }

  if (typeof value !== "object") {
    throw new TypeError(
      `Spreadsheet packed storage logical column ${logicalIndex} must be JSON-compatible.`,
    );
  }

  if (seen.has(value)) {
    throw new TypeError(
      `Spreadsheet packed storage logical column ${logicalIndex} must not contain circular data.`,
    );
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) {
        throw new TypeError(
          `Spreadsheet packed storage logical column ${logicalIndex} must not contain sparse arrays.`,
        );
      }

      requireJsonCompatible(value[index], logicalIndex, seen);
    }

    seen.delete(value);
    return;
  }

  if (!isPlainObject(value)) {
    throw new TypeError(
      `Spreadsheet packed storage logical column ${logicalIndex} must be JSON-compatible.`,
    );
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw new TypeError(
        `Spreadsheet packed storage logical column ${logicalIndex} must not contain symbol keys.`,
      );
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);

    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new TypeError(
        `Spreadsheet packed storage logical column ${logicalIndex} must contain enumerable data properties only.`,
      );
    }

    requireJsonCompatible(descriptor.value, logicalIndex, seen);
  }

  seen.delete(value);
}

function parsePayload(value: unknown, expectedWidth: number): readonly unknown[] {
  if (typeof value !== "string") {
    throw new TypeError("Spreadsheet packed storage payload must be a JSON string.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new TypeError("Spreadsheet packed storage payload must contain valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new TypeError("Spreadsheet packed storage payload must contain a JSON array.");
  }

  if (parsed.length !== expectedWidth) {
    throw new RangeError(
      `Spreadsheet packed storage payload expected ${expectedWidth} values, received ${parsed.length}.`,
    );
  }

  return parsed;
}

function requireStorageLayoutWidth(width: number, kind: "logical" | "physical"): number {
  if (!Number.isInteger(width) || width <= 0) {
    throw new RangeError(`Spreadsheet storage layout ${kind} width must be a positive integer.`);
  }

  return width;
}

function requireStorageLayoutPhysicalIndex(index: number, physicalWidth: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= physicalWidth) {
    throw new RangeError(
      `Spreadsheet storage layout physical index ${index} must be between 0 and ${physicalWidth - 1}.`,
    );
  }

  return index;
}

function requireStorageLayoutPayloadIndex(index: number): number {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(
      "Spreadsheet storage layout payload index must be a non-negative integer.",
    );
  }

  return index;
}

interface ResolvedStorageLayout {
  readonly logicalWidth: number;
  readonly physicalWidth: number;
  readonly locations: readonly SpreadsheetStorageLocation[];
}

function requireStorageLogicalIndex(index: number, logicalWidth: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= logicalWidth) {
    throw new RangeError(
      `Spreadsheet storage logical column index ${index} must be between 0 and ${logicalWidth - 1}.`,
    );
  }

  return index;
}

function resolveStorageLayout(layout: SpreadsheetStorageLayout): ResolvedStorageLayout {
  const logicalWidth = requireStorageLayoutWidth(layout.logicalWidth, "logical");
  const physicalWidth = requireStorageLayoutWidth(layout.physicalWidth, "physical");
  const locations = Array.from(
    { length: logicalWidth },
    (_, logicalIndex): SpreadsheetStorageLocation => {
      const location = layout.locate(logicalIndex);

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
    },
  );
  const occupiedPhysicalIndices = new Set<number>();
  const payloadIndices = new Set<number>();
  let payloadPhysicalIndex: number | undefined;

  for (const location of locations) {
    const physicalIndex = requireStorageLayoutPhysicalIndex(location.physicalIndex, physicalWidth);

    if (location.kind === "materialized") {
      if (occupiedPhysicalIndices.has(physicalIndex)) {
        throw new RangeError(
          `Spreadsheet storage layout physical index ${physicalIndex} must not be mapped more than once.`,
        );
      }

      occupiedPhysicalIndices.add(physicalIndex);
      continue;
    }

    if (payloadPhysicalIndex === undefined) {
      if (occupiedPhysicalIndices.has(physicalIndex)) {
        throw new RangeError(
          `Spreadsheet storage layout physical index ${physicalIndex} must not be mapped more than once.`,
        );
      }

      payloadPhysicalIndex = physicalIndex;
      occupiedPhysicalIndices.add(physicalIndex);
    } else if (physicalIndex !== payloadPhysicalIndex) {
      throw new RangeError(
        "Spreadsheet storage layout payload columns must share one physical index.",
      );
    }

    const payloadIndex = requireStorageLayoutPayloadIndex(location.payloadIndex);

    if (payloadIndices.has(payloadIndex)) {
      throw new RangeError(
        `Spreadsheet storage layout payload index ${payloadIndex} must not be mapped more than once.`,
      );
    }

    payloadIndices.add(payloadIndex);
  }

  for (let payloadIndex = 0; payloadIndex < payloadIndices.size; payloadIndex += 1) {
    if (!payloadIndices.has(payloadIndex)) {
      throw new RangeError("Spreadsheet storage layout payload indices must be contiguous from 0.");
    }
  }

  if (occupiedPhysicalIndices.size !== physicalWidth) {
    throw new RangeError("Spreadsheet storage layout must map every physical column.");
  }

  return {
    logicalWidth,
    physicalWidth,
    locations,
  };
}

export function createSpreadsheetStorageCodec(
  layout: SpreadsheetStorageLayout,
): SpreadsheetStorageCodec;
export function createSpreadsheetStorageCodec<
  Row,
  Columns extends SpreadsheetSchemaColumnSource<Row>,
>(
  schema: SpreadsheetSchema<Row, Columns>,
  options: SpreadsheetStorageLayoutOptions<Row>,
): SpreadsheetStorageCodec;
export function createSpreadsheetStorageCodec<
  Row,
  Columns extends SpreadsheetSchemaColumnSource<Row>,
>(
  source: SpreadsheetStorageLayout | SpreadsheetSchema<Row, Columns>,
  options?: SpreadsheetStorageLayoutOptions<Row>,
): SpreadsheetStorageCodec {
  let layout: SpreadsheetStorageLayout;

  if ("mode" in source) {
    if (options !== undefined) {
      throw new TypeError("Spreadsheet storage codec options require a schema.");
    }

    layout = source;
  } else {
    if (options === undefined) {
      throw new TypeError("Spreadsheet storage codec schema options are required.");
    }

    layout = createSpreadsheetStorageLayout(source, options);
  }
  const { logicalWidth, physicalWidth, locations } = resolveStorageLayout(layout);
  const payloadLocations = locations.filter(
    (location): location is Extract<SpreadsheetStorageLocation, { readonly kind: "payload" }> =>
      location.kind === "payload",
  );
  const payloadPhysicalIndex = payloadLocations[0]?.physicalIndex;
  const payloadWidth = payloadLocations.length;

  return {
    logicalWidth,
    physicalWidth,

    locate(logicalIndex): SpreadsheetStorageLocation {
      return locations[requireStorageLogicalIndex(logicalIndex, logicalWidth)]!;
    },

    encode(values): readonly unknown[] {
      const logicalValues = requireStorageWidth(values, logicalWidth, "logical");

      const physicalValues = Array.from<unknown>({
        length: physicalWidth,
      });
      const payload = Array.from<unknown>({
        length: payloadWidth,
      });

      for (let logicalIndex = 0; logicalIndex < locations.length; logicalIndex += 1) {
        const location = locations[logicalIndex]!;
        const value = logicalValues[logicalIndex];

        if (location.kind === "materialized") {
          physicalValues[location.physicalIndex] = value;
          continue;
        }

        requireJsonCompatible(value, logicalIndex, new Set());
        payload[location.payloadIndex] = value;
      }

      if (payloadPhysicalIndex !== undefined) {
        physicalValues[payloadPhysicalIndex] = JSON.stringify(payload);
      }

      return physicalValues;
    },

    decode(values): readonly unknown[] {
      const physicalValues = requireStorageWidth(values, physicalWidth, "physical");

      const payload =
        payloadPhysicalIndex === undefined
          ? []
          : parsePayload(physicalValues[payloadPhysicalIndex], payloadWidth);
      const logicalValues = Array.from<unknown>({
        length: logicalWidth,
      });

      for (let logicalIndex = 0; logicalIndex < locations.length; logicalIndex += 1) {
        const location = locations[logicalIndex]!;

        logicalValues[logicalIndex] =
          location.kind === "materialized"
            ? physicalValues[location.physicalIndex]
            : payload[location.payloadIndex];
      }

      return logicalValues;
    },
  };
}
