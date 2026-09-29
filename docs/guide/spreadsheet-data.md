---
outline: deep
---

# Spreadsheet Data

Vegas provides a typed data layer for server-side code that stores structured rows in Google Sheets. The API is exported from `@vegasjs/vegas/server` and is designed to keep row encoding, queries, physical storage, and repository operations explicit.

The data layer does not replace `SpreadsheetApp`. You still choose the spreadsheet and sheet with the Apps Script API, then wrap the `Sheet` with a Vegas table.

## Define a Row Schema

Start with a row codec and named columns. The codec owns the conversion between your application row and logical spreadsheet values.

```typescript
import {
  createSpreadsheetColumn,
  createSpreadsheetRowCodec,
  createSpreadsheetSchema,
} from "@vegasjs/vegas/server";

interface UserRow {
  readonly id: number;
  readonly name: string;
  readonly status: "active" | "disabled";
}

const userCodec = createSpreadsheetRowCodec<UserRow>(
  3,
  (values) => ({
    id: Number(values[0]),
    name: String(values[1]),
    status: values[2] === "active" ? "active" : "disabled",
  }),
  (row) => [row.id, row.name, row.status],
);

const userColumns = {
  id: createSpreadsheetColumn<UserRow, number>("id", 0, (row) => row.id),
  name: createSpreadsheetColumn<UserRow, string>("name", 1, (row) => row.name),
  status: createSpreadsheetColumn<UserRow, UserRow["status"]>("status", 2, (row) => row.status),
};

const userSchema = createSpreadsheetSchema(userCodec, userColumns);
```

A schema validates column names and logical indexes against the codec width. Column indexes are zero-based logical indexes; they are independent of the sheet coordinates used by the table.

## Create a Table

Wrap a `GoogleAppsScript.Spreadsheet.Sheet` with `createSpreadsheetTable()`.

```typescript
import { createSpreadsheetTable } from "@vegasjs/vegas/server";

function getUserTable() {
  const spreadsheet = SpreadsheetApp.openById("spreadsheet-id");
  const sheet = spreadsheet.getSheetByName("Users");

  if (sheet === null) {
    throw new Error('Sheet "Users" does not exist.');
  }

  return createSpreadsheetTable(sheet, userSchema, {
    startRow: 2,
    startColumn: 1,
  });
}
```

`startRow` and `startColumn` are one-based sheet coordinates. In this example row 1 can be used for headings while table data starts at row 2.

Vegas determines the table boundary from its physical columns. Trailing rows whose physical cells are all empty strings are outside the table; an empty row between non-empty table rows remains part of the table. Deleting a row shifts only the table's physical rectangle, so cells outside the table width are not shifted.

## Query Rows

For direct conditions, use the query expression helpers.

```typescript
import { spreadsheetEq } from "@vegasjs/vegas/server";

const activeUsers = getUserTable().query(spreadsheetEq(userSchema.columns.status, "active"));
```

For ordering, limits, or multiple conditions, create typed query fields and a query builder.

```typescript
import { createSpreadsheetQuery, createSpreadsheetQueryFields } from "@vegasjs/vegas/server";

const userFields = createSpreadsheetQueryFields(userSchema);

const query = createSpreadsheetQuery(userFields)
  .where((fields) => fields.status.eq("active"))
  .orderBy((fields) => fields.name.asc())
  .limit(100);

const rows = getUserTable().execute(query);
```

Repeated `where()` calls are combined with logical AND. Repeated `orderBy()` calls append stable sort keys, and a later `limit()` replaces the previous limit. Query builders are immutable: each method returns a new query.

Vegas can lower eligible static query-builder chains used with `execute()` or `executeEntries()` into data-only query plans during the build. The same query APIs continue to work at runtime when a chain cannot be lowered.

## Choose a Physical Storage Layout

By default, each logical value occupies one physical sheet column. For wider rows, you can explicitly choose a packed layout.

```typescript
import { createSpreadsheetStorageCodec, createSpreadsheetTable } from "@vegasjs/vegas/server";

const storageCodec = createSpreadsheetStorageCodec(userSchema, {
  mode: "indexed-packed",
  key: userSchema.columns.id,
  materialize: [userSchema.columns.status],
});

const table = createSpreadsheetTable(sheet, userSchema, {
  startRow: 2,
  storageCodec,
});
```

Vegas provides three generated layout modes:

- `columns`: every logical column is materialized as a physical sheet column.
- `packed`: the key is materialized and all other logical values share one JSON payload column.
- `indexed-packed`: the key and selected columns are materialized; the remaining values share one JSON payload column.

Materialized columns can be used for query pushdown and repository key lookup without decoding the packed payload. Packed values must be losslessly JSON-compatible; values such as `undefined`, non-finite numbers, `bigint`, functions, symbols, `Date` objects, sparse arrays, circular structures, and non-plain objects are rejected. Convert such values explicitly in your row codec when needed.

## Use a Repository for Keyed Mutations

A repository adds unique-key lookup and keyed insert, update, and delete operations on top of a table. When the table was created from a schema, use a column from that same schema as the key.

```typescript
import {
  createSpreadsheetRepository,
  createSpreadsheetRepositoryScriptLockGuard,
} from "@vegasjs/vegas/server";

const repository = createSpreadsheetRepository(getUserTable(), userSchema.columns.id, {
  mutationGuard: createSpreadsheetRepositoryScriptLockGuard(),
});

repository.insert({ id: 1, name: "Ada", status: "active" });

const user = repository.findByKey(1);

repository.updateByKey(1, {
  id: 1,
  name: "Ada Lovelace",
  status: "active",
});

repository.deleteByKey(1);
```

Repository keys are unique according to `Object.is()`. If existing sheet data contains more than one matching key, lookup and mutation operations throw `SpreadsheetRepositoryKeyConflictError`.

The script-lock guard is opt-in. It serializes repository mutations performed by executions of the same Apps Script project and calls `SpreadsheetApp.flush()` before releasing the lock. Separate Apps Script projects that access the same spreadsheet are not coordinated by this guard.

## Keep Storage and Domain Conversion Separate

Use the row codec for domain conversion and the storage codec for physical layout. For example, convert a `Date` to a string or number in the row codec rather than relying on packed JSON storage to preserve a `Date` object. This keeps the logical row contract explicit and makes both `columns` and packed storage modes behave consistently.
