import { describe, expect, test } from "vitest";

import { transformSpreadsheetQueryPlans } from "./spreadsheet-query-transform";

const id = "/home/user/project/src/Code.ts";

describe("transformSpreadsheetQueryPlans", () => {
  test("lower a static selector query passed directly to a Vegas table", () => {
    const source = `
import {
  createSpreadsheetQuery,
  createSpreadsheetQueryFields,
  createSpreadsheetTable,
} from "@vegasjs/vegas/server";

const table = createSpreadsheetTable(sheet, codec);
const fields = createSpreadsheetQueryFields(columns);

export function run(minimumId: number) {
  return table.execute(
    createSpreadsheetQuery(fields)
      .where(($) => $.active.eq(true))
      .where(($) => $.id.gte(minimumId))
      .orderBy(($) => $.name.asc())
      .orderBy(($) => $.id.desc())
      .limit(10),
  );
}
`;

    const transformed = transformSpreadsheetQueryPlans(source, id);

    expect(transformed).not.toBeNull();
    expect(transformed).toContain(
      '{where:{kind:"and",expressions:[fields.active.eq(true),fields.id.gte(minimumId)]},orderBy:[fields.name.asc(),fields.id.desc()],limit:(10)}',
    );
    expect(transformed).toContain("table.execute(");
    expect(transformed).not.toContain("createSpreadsheetQuery(fields)");
  });

  test("lower statically indexed query fields to literal plan data", () => {
    const source = `
import {
  createSpreadsheetColumn,
  createSpreadsheetQuery,
  createSpreadsheetQueryFields,
  createSpreadsheetTable,
} from "@vegasjs/vegas/server";

const idColumn = createSpreadsheetColumn("id", 0, (row) => row.id);
const nameColumn = createSpreadsheetColumn("name", 1, (row) => row.name);
const activeColumn = createSpreadsheetColumn("active", 2, (row) => row.active);
const columns = { id: idColumn, name: nameColumn, active: activeColumn };
const fields = createSpreadsheetQueryFields(columns);
const table = createSpreadsheetTable(sheet, codec);

export function run(minimumId: number) {
  return table.execute(
    createSpreadsheetQuery(fields)
      .where(($) => $.active.eq(true))
      .where(($) => $.id.gte(minimumId))
      .orderBy(($) => $.name.asc())
      .orderBy(($) => $.id.desc())
      .limit(10),
  );
}
`;

    const transformed = transformSpreadsheetQueryPlans(source, id);

    expect(transformed).toContain(
      '{where:{kind:"and",expressions:[{kind:"equal",column:2,value:(true)},{kind:"greater-than-or-equal",column:0,value:(minimumId)}]},orderBy:[{column:1,direction:"asc"},{column:0,direction:"desc"}],limit:(10)}',
    );
    expect(transformed).not.toContain("fields.active.eq");
    expect(transformed).not.toContain("fields.id.gte");
    expect(transformed).not.toContain("fields.name.asc");
  });

  test("support aliased Vegas query and table factory imports", () => {
    const source = `
import {
  createSpreadsheetQuery as query,
  createSpreadsheetQueryFields,
  createSpreadsheetTable as tableFactory,
} from "@vegasjs/vegas/server";

const users = tableFactory(sheet, codec);
const fields = createSpreadsheetQueryFields(columns);

export function run(limit: number) {
  return users.execute(
    query(fields)
      .where(($) => $.id.gt(0))
      .orderBy(($) => $.id.asc())
      .limit(limit),
  );
}
`;

    const transformed = transformSpreadsheetQueryPlans(source, id);

    expect(transformed).toContain(
      "{where:fields.id.gt(0),orderBy:[fields.id.asc()],limit:(limit)}",
    );
  });

  test("leave dynamic query composition on the runtime builder", () => {
    const source = `
import {
  createSpreadsheetQuery,
  createSpreadsheetQueryFields,
  createSpreadsheetTable,
} from "@vegasjs/vegas/server";

const table = createSpreadsheetTable(sheet, codec);
const fields = createSpreadsheetQueryFields(columns);

export function run(enabled: boolean) {
  let query = createSpreadsheetQuery(fields);

  if (enabled) {
    query = query.where(($) => $.active.eq(true));
  }

  return table.execute(query);
}
`;

    expect(transformSpreadsheetQueryPlans(source, id)).toBeNull();
  });

  test("leave function-local fields on the runtime builder", () => {
    const source = `
import {
  createSpreadsheetQuery,
  createSpreadsheetQueryFields,
  createSpreadsheetTable,
} from "@vegasjs/vegas/server";

const table = createSpreadsheetTable(sheet, codec);

export function run() {
  const fields = createSpreadsheetQueryFields(columns);

  return table.execute(
    createSpreadsheetQuery(fields).where(($) => $.active.eq(true)),
  );
}
`;

    expect(transformSpreadsheetQueryPlans(source, id)).toBeNull();
  });

  test("leave non-canonical chain order on the runtime builder", () => {
    const source = `
import {
  createSpreadsheetQuery,
  createSpreadsheetQueryFields,
  createSpreadsheetTable,
} from "@vegasjs/vegas/server";

const table = createSpreadsheetTable(sheet, codec);
const fields = createSpreadsheetQueryFields(columns);

export function run() {
  return table.execute(
    createSpreadsheetQuery(fields)
      .orderBy(($) => $.name.asc())
      .where(($) => $.active.eq(true)),
  );
}
`;

    expect(transformSpreadsheetQueryPlans(source, id)).toBeNull();
  });

  test("leave queries passed to an unrelated execute method unchanged", () => {
    const source = `
import {
  createSpreadsheetQuery,
  createSpreadsheetQueryFields,
} from "@vegasjs/vegas/server";

const fields = createSpreadsheetQueryFields(columns);

export function run(executor: Executor) {
  return executor.execute(
    createSpreadsheetQuery(fields).where(($) => $.active.eq(true)),
  );
}
`;

    expect(transformSpreadsheetQueryPlans(source, id)).toBeNull();
  });

  test("leave selector block bodies on the runtime builder", () => {
    const source = `
import {
  createSpreadsheetQuery,
  createSpreadsheetQueryFields,
  createSpreadsheetTable,
} from "@vegasjs/vegas/server";

const table = createSpreadsheetTable(sheet, codec);
const fields = createSpreadsheetQueryFields(columns);

export function run() {
  return table.execute(
    createSpreadsheetQuery(fields).where(($) => {
      return $.active.eq(true);
    }),
  );
}
`;

    expect(transformSpreadsheetQueryPlans(source, id)).toBeNull();
  });

  test("do not transform a shadowed table binding", () => {
    const source = `
import {
  createSpreadsheetQuery,
  createSpreadsheetQueryFields,
  createSpreadsheetTable,
} from "@vegasjs/vegas/server";

const table = createSpreadsheetTable(sheet, codec);
const fields = createSpreadsheetQueryFields(columns);

export function run(table: Executor) {
  return table.execute(
    createSpreadsheetQuery(fields).where(($) => $.active.eq(true)),
  );
}
`;

    expect(transformSpreadsheetQueryPlans(source, id)).toBeNull();
  });
});
