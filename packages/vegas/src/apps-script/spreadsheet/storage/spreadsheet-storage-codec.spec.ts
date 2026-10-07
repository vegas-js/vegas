import { describe, expect, expectTypeOf, test } from "vitest";

import { createSpreadsheetRowCodec } from "../spreadsheet-row-codec";
import { createSpreadsheetColumn, createSpreadsheetSchema } from "../spreadsheet-schema";
import {
  createSpreadsheetStorageCodec,
  type SpreadsheetStorageCodec,
} from "./spreadsheet-storage-codec";
import {
  createSpreadsheetStorageLayout,
  type SpreadsheetStorageLayout,
  type SpreadsheetStorageLocation,
} from "./spreadsheet-storage-layout";

interface UserRow {
  readonly id: number;
  readonly name: string;
  readonly status: string;
  readonly metadata: {
    readonly active: boolean;
  };
}

function createUserSchema() {
  const rowCodec = createSpreadsheetRowCodec<UserRow>(
    4,
    (values) => ({
      id: Number(values[0]),
      name: String(values[1]),
      status: String(values[2]),
      metadata: values[3] as UserRow["metadata"],
    }),
    (row) => [row.id, row.name, row.status, row.metadata],
  );
  const id = createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id);
  const name = createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name);
  const status = createSpreadsheetColumn<UserRow, string>("status", 2, (row) => row.status);
  const metadata = createSpreadsheetColumn<UserRow, UserRow["metadata"]>(
    "metadata",
    3,
    (row) => row.metadata,
  );
  const schema = createSpreadsheetSchema(rowCodec, [id, name, status, metadata]);

  return {
    schema,
    id,
    name,
    status,
    metadata,
  };
}

describe("createSpreadsheetStorageCodec", () => {
  test("copy logical values directly in columns mode", () => {
    const { schema } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "columns",
    });
    const codec = createSpreadsheetStorageCodec(layout);
    const logicalValues = [1, "Ada", "active", { active: true }];

    expectTypeOf(codec).toEqualTypeOf<SpreadsheetStorageCodec>();
    expect(codec.logicalWidth).toBe(4);
    expect(codec.physicalWidth).toBe(4);
    expect(codec.encode(logicalValues)).toStrictEqual(logicalValues);
    expect(codec.encode(logicalValues)).not.toBe(logicalValues);
    expect(codec.decode(logicalValues)).toStrictEqual(logicalValues);
    expect(codec.decode(logicalValues)).not.toBe(logicalValues);
  });

  test("respect materialized physical indices in custom layouts", () => {
    const layout: SpreadsheetStorageLayout = {
      mode: "columns",
      logicalWidth: 2,
      physicalWidth: 2,
      locate(logicalIndex) {
        if (logicalIndex === 0) {
          return {
            kind: "materialized",
            physicalIndex: 1,
          };
        }

        return {
          kind: "materialized",
          physicalIndex: 0,
        };
      },
    };
    const codec = createSpreadsheetStorageCodec(layout);

    expect(codec.encode(["logical-0", "logical-1"])).toStrictEqual(["logical-1", "logical-0"]);
    expect(codec.decode(["physical-0", "physical-1"])).toStrictEqual(["physical-1", "physical-0"]);
  });

  test("snapshot custom layout mappings when creating a codec", () => {
    let logicalWidth = 2;
    let physicalWidth = 2;
    let reversed = true;
    const layout: SpreadsheetStorageLayout = {
      mode: "columns",
      get logicalWidth() {
        return logicalWidth;
      },
      get physicalWidth() {
        return physicalWidth;
      },
      locate(logicalIndex) {
        return {
          kind: "materialized",
          physicalIndex: reversed ? 1 - logicalIndex : logicalIndex,
        };
      },
    };
    const codec = createSpreadsheetStorageCodec(layout);

    logicalWidth = 1;
    physicalWidth = 1;
    reversed = false;

    expect(codec.logicalWidth).toBe(2);
    expect(codec.physicalWidth).toBe(2);
    expect(codec.locate(0)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 1,
    });
    expect(codec.encode(["logical-0", "logical-1"])).toStrictEqual(["logical-1", "logical-0"]);
    expect(codec.decode(["physical-0", "physical-1"])).toStrictEqual(["physical-1", "physical-0"]);
    expect(() => codec.locate(2)).toThrow(
      "Spreadsheet storage logical column index 2 must be between 0 and 1.",
    );
  });

  test("do not expose mutable codec layout mappings", () => {
    const layout: SpreadsheetStorageLayout = {
      mode: "columns",
      logicalWidth: 2,
      physicalWidth: 2,
      locate(logicalIndex) {
        return {
          kind: "materialized",
          physicalIndex: 1 - logicalIndex,
        };
      },
    };
    const codec = createSpreadsheetStorageCodec(layout);
    const location = codec.locate(0);

    expect(Reflect.set(location, "physicalIndex", 0)).toBe(true);
    expect(codec.locate(0)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 1,
    });
    expect(codec.encode(["logical-0", "logical-1"])).toStrictEqual(["logical-1", "logical-0"]);
    expect(codec.decode(["physical-0", "physical-1"])).toStrictEqual(["physical-1", "physical-0"]);
  });

  test("reject invalid custom layout mappings", () => {
    const duplicatePhysicalIndex: SpreadsheetStorageLayout = {
      mode: "columns",
      logicalWidth: 2,
      physicalWidth: 2,
      locate() {
        return {
          kind: "materialized",
          physicalIndex: 0,
        };
      },
    };
    const splitPayload: SpreadsheetStorageLayout = {
      mode: "packed",
      logicalWidth: 2,
      physicalWidth: 2,
      locate(logicalIndex) {
        return {
          kind: "payload",
          physicalIndex: logicalIndex,
          payloadIndex: logicalIndex,
        };
      },
    };
    const sparsePayload: SpreadsheetStorageLayout = {
      mode: "packed",
      logicalWidth: 2,
      physicalWidth: 1,
      locate(logicalIndex) {
        return {
          kind: "payload",
          physicalIndex: 0,
          payloadIndex: logicalIndex === 0 ? 0 : 2,
        };
      },
    };
    const unmappedPhysicalColumn: SpreadsheetStorageLayout = {
      mode: "columns",
      logicalWidth: 1,
      physicalWidth: 2,
      locate() {
        return {
          kind: "materialized",
          physicalIndex: 0,
        };
      },
    };
    const unsupportedLocationKind: SpreadsheetStorageLayout = {
      mode: "columns",
      logicalWidth: 1,
      physicalWidth: 1,
      locate() {
        return {
          kind: "unsupported",
          physicalIndex: 0,
        } as unknown as SpreadsheetStorageLocation;
      },
    };

    expect(() => createSpreadsheetStorageCodec(duplicatePhysicalIndex)).toThrow(
      "Spreadsheet storage layout physical index 0 must not be mapped more than once.",
    );
    expect(() => createSpreadsheetStorageCodec(splitPayload)).toThrow(
      "Spreadsheet storage layout payload columns must share one physical index.",
    );
    expect(() => createSpreadsheetStorageCodec(sparsePayload)).toThrow(
      "Spreadsheet storage layout payload indices must be contiguous from 0.",
    );
    expect(() => createSpreadsheetStorageCodec(unmappedPhysicalColumn)).toThrow(
      "Spreadsheet storage layout must map every physical column.",
    );
    expect(() => createSpreadsheetStorageCodec(unsupportedLocationKind)).toThrow(
      'Spreadsheet storage layout location kind "unsupported" is not supported.',
    );
  });

  test("create a storage codec directly from a schema", () => {
    const { schema, id, status } = createUserSchema();
    const codec = createSpreadsheetStorageCodec(schema, {
      mode: "indexed-packed",
      key: id,
      materialize: [status],
    });

    expectTypeOf(codec).toEqualTypeOf<SpreadsheetStorageCodec>();
    expect(codec.logicalWidth).toBe(4);
    expect(codec.physicalWidth).toBe(3);
    expect(codec.locate(0)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 0,
    });
    expect(codec.locate(2)).toStrictEqual({
      kind: "materialized",
      physicalIndex: 1,
    });
    expect(codec.encode([1, "Ada", "active", { active: true }])).toStrictEqual([
      1,
      "active",
      '["Ada",{"active":true}]',
    ]);
  });

  test("encode and decode a packed JSON tuple", () => {
    const { schema, id } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "packed",
      key: id,
    });
    const codec = createSpreadsheetStorageCodec(layout);

    const physicalValues = codec.encode([1, "Ada", "active", { active: true }]);

    expect(physicalValues).toStrictEqual([1, '["Ada","active",{"active":true}]']);
    expect(codec.decode(physicalValues)).toStrictEqual([1, "Ada", "active", { active: true }]);
  });

  test("keep indexed columns materialized outside the payload", () => {
    const { schema, id, status } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "indexed-packed",
      key: id,
      materialize: [status],
    });
    const codec = createSpreadsheetStorageCodec(layout);

    const physicalValues = codec.encode([1, "Ada", "active", { active: true }]);

    expect(physicalValues).toStrictEqual([1, "active", '["Ada",{"active":true}]']);
    expect(codec.decode(physicalValues)).toStrictEqual([1, "Ada", "active", { active: true }]);
  });

  test.each([
    undefined,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -0,
    1n,
    Symbol("value"),
    () => undefined,
    new Date(0),
  ])("reject lossy packed JSON values: %s", (value) => {
    const { schema, id } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "packed",
      key: id,
    });
    const codec = createSpreadsheetStorageCodec(layout);

    expect(() => codec.encode([1, value, "active", { active: true }])).toThrow(
      "Spreadsheet packed storage logical column 1 must be JSON-compatible.",
    );
  });

  test("reject circular packed JSON values", () => {
    const { schema, id } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "packed",
      key: id,
    });
    const codec = createSpreadsheetStorageCodec(layout);
    const value: { self?: unknown } = {};
    value.self = value;

    expect(() => codec.encode([1, value, "active", { active: true }])).toThrow(
      "Spreadsheet packed storage logical column 1 must not contain circular data.",
    );
  });

  test("reject sparse arrays in packed JSON values", () => {
    const { schema, id } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "packed",
      key: id,
    });
    const codec = createSpreadsheetStorageCodec(layout);
    const value: unknown[] = [];
    value.length = 2;

    expect(() => codec.encode([1, value, "active", { active: true }])).toThrow(
      "Spreadsheet packed storage logical column 1 must not contain sparse arrays.",
    );
  });

  test("reject invalid physical payloads", () => {
    const { schema, id } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "packed",
      key: id,
    });
    const codec = createSpreadsheetStorageCodec(layout);

    expect(() => codec.decode([1, 42])).toThrow(
      "Spreadsheet packed storage payload must be a JSON string.",
    );
    expect(() => codec.decode([1, "{"])).toThrow(
      "Spreadsheet packed storage payload must contain valid JSON.",
    );
    expect(() => codec.decode([1, "{}"])).toThrow(
      "Spreadsheet packed storage payload must contain a JSON array.",
    );
    expect(() => codec.decode([1, '["Ada"]'])).toThrow(
      "Spreadsheet packed storage payload expected 3 values, received 1.",
    );
  });

  test("validate logical and physical widths", () => {
    const { schema, id } = createUserSchema();
    const layout = createSpreadsheetStorageLayout(schema, {
      mode: "packed",
      key: id,
    });
    const codec = createSpreadsheetStorageCodec(layout);

    expect(() => codec.encode([1, "Ada"])).toThrow(
      "Spreadsheet storage codec expected 4 logical values, received 2.",
    );
    expect(() => codec.decode([1])).toThrow(
      "Spreadsheet storage codec expected 2 physical values, received 1.",
    );
  });
});
