import { parseSync } from "vite";
import { describe, expect, test } from "vitest";

import { collectStaticSpreadsheetQueryFieldIndexes } from "./spreadsheet-query-static-fields";

const id = "/home/user/project/src/Code.ts";

function collect(source: string): ReadonlyMap<string, ReadonlyMap<string, number>> {
  const { program } = parseSync(id, source);

  return collectStaticSpreadsheetQueryFieldIndexes(
    program,
    "createSpreadsheetQueryFields",
    "createSpreadsheetColumn",
    "createSpreadsheetSchema",
  );
}

describe("collectStaticSpreadsheetQueryFieldIndexes", () => {
  test("resolve module-level column indexes through a columns object", () => {
    const fields = collect(`
const idColumn = createSpreadsheetColumn("id", 0, (row) => row.id);
const nameColumn = createSpreadsheetColumn("name", 1, (row) => row.name);
const columns = { id: idColumn, displayName: nameColumn };
const queryFields = createSpreadsheetQueryFields(columns);
`);

    expect(fields.get("queryFields")).toStrictEqual(
      new Map([
        ["id", 0],
        ["displayName", 1],
      ]),
    );
  });

  test("resolve an inline fields object", () => {
    const fields = collect(`
const idColumn = createSpreadsheetColumn("id", 0, (row) => row.id);
const queryFields = createSpreadsheetQueryFields({ identifier: idColumn });
`);

    expect(fields.get("queryFields")).toStrictEqual(new Map([["identifier", 0]]));
  });

  test("resolve column indexes through a schema column record", () => {
    const fields = collect(`
const idColumn = createSpreadsheetColumn("id", 0, (row) => row.id);
const nameColumn = createSpreadsheetColumn("name", 1, (row) => row.name);
const columns = { id: idColumn, displayName: nameColumn };
const schema = createSpreadsheetSchema(codec, columns);
const queryFields = createSpreadsheetQueryFields(schema.columns);
`);

    expect(fields.get("queryFields")).toStrictEqual(
      new Map([
        ["id", 0],
        ["displayName", 1],
      ]),
    );
  });

  test("skip columns whose runtime validation cannot be proven statically", () => {
    const fields = collect(`
const dynamicIndex = getColumnIndex();
const idColumn = createSpreadsheetColumn("id", dynamicIndex, (row) => row.id);
const queryFields = createSpreadsheetQueryFields({ id: idColumn });
`);

    expect(fields.has("queryFields")).toBe(false);
  });

  test("skip columns with potentially effectful getter arguments", () => {
    const fields = collect(`
const idColumn = createSpreadsheetColumn("id", 0, createGetter());
const queryFields = createSpreadsheetQueryFields({ id: idColumn });
`);

    expect(fields.has("queryFields")).toBe(false);
  });
});
