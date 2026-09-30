---
outline: deep
---

# Spreadsheet Data

Vegas는 Google Sheets에 구조화된 row를 저장하는 서버 측 코드를 위해 typed data layer를 제공합니다. API는 `@vegasjs/vegas/server`에서 export되며 row encoding, query, physical storage, repository operation을 명시적으로 유지하도록 설계되어 있습니다.

이 data layer는 `SpreadsheetApp`을 대체하지 않습니다. Spreadsheet와 Sheet는 계속 Apps Script API로 선택하고, 해당 `Sheet`를 Vegas table로 wrap합니다.

## Row Schema 정의

먼저 row codec과 이름이 있는 column을 정의합니다. codec은 애플리케이션 row와 논리적인 Spreadsheet 값 사이의 변환을 담당합니다.

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

schema는 codec width에 대해 column 이름과 논리 index를 검증합니다. column index는 0부터 시작하는 논리 index이며 table이 사용하는 Sheet 좌표와는 독립적입니다.

## Table 생성

`GoogleAppsScript.Spreadsheet.Sheet`를 `createSpreadsheetTable()`로 wrap합니다.

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

`startRow`와 `startColumn`은 1부터 시작하는 Sheet 좌표입니다. 이 예에서는 row 1을 heading으로 사용하고 table data는 row 2에서 시작할 수 있습니다.

Vegas는 physical column에서 table 경계를 결정합니다. physical cell이 모두 빈 문자열인 trailing row는 table 바깥에 있지만, 비어 있지 않은 table row 사이의 빈 row는 table의 일부로 유지됩니다. row를 삭제할 때는 table의 physical rectangle만 shift하므로 table width 바깥의 cell은 이동하지 않습니다.

## Row Query

직접 condition을 지정할 때는 query expression helper를 사용합니다.

```typescript
import { spreadsheetEq } from "@vegasjs/vegas/server";

const activeUsers = getUserTable().query(spreadsheetEq(userSchema.columns.status, "active"));
```

ordering, limit, 여러 condition이 필요하면 typed query field와 query builder를 만듭니다.

```typescript
import { createSpreadsheetQuery, createSpreadsheetQueryFields } from "@vegasjs/vegas/server";

const userFields = createSpreadsheetQueryFields(userSchema);

const query = createSpreadsheetQuery(userFields)
  .where((fields) => fields.status.eq("active"))
  .orderBy((fields) => fields.name.asc())
  .limit(100);

const rows = getUserTable().execute(query);
```

여러 번 호출한 `where()`는 논리 AND로 결합됩니다. 여러 번 호출한 `orderBy()`는 stable sort key를 추가하고, 나중의 `limit()`는 이전 limit를 교체합니다. query builder는 immutable하며 각 method는 새로운 query를 반환합니다.

Vegas는 `execute()` 또는 `executeEntries()`와 함께 사용되는 조건을 충족하는 static query-builder chain을 빌드 시 data-only query plan으로 lower할 수 있습니다. chain을 lower할 수 없는 경우에도 같은 query API를 Runtime에서 계속 사용할 수 있습니다.

## Physical Storage Layout 선택

기본적으로 각 논리 값은 하나의 physical Sheet column을 사용합니다. row가 넓다면 packed layout을 명시적으로 선택할 수 있습니다.

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

Vegas는 세 가지 generated layout mode를 제공합니다.

- `columns`: 모든 논리 column을 physical Sheet column으로 materialize합니다.
- `packed`: key를 materialize하고 나머지 모든 논리 값을 하나의 JSON payload column에 저장합니다.
- `indexed-packed`: key와 선택한 column을 materialize하고 나머지 값을 하나의 JSON payload column에 저장합니다.

materialize된 column은 packed payload를 decode하지 않고도 query pushdown과 repository key lookup에 사용할 수 있습니다. packed value는 lossless하게 JSON-compatible해야 합니다. `undefined`, 비유한 number, `bigint`, function, symbol, `Date` object, sparse array, circular structure, plain object가 아닌 값 등은 거부됩니다. 필요한 경우 row codec에서 명시적으로 변환하세요.

## Repository를 이용한 Keyed Mutation

repository는 table 위에 unique-key lookup과 key를 지정한 insert, update, delete operation을 추가합니다. table을 schema에서 생성한 경우에는 같은 schema의 column을 key로 사용하세요.

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

repository key는 `Object.is()`에 따라 고유합니다. 기존 Sheet data에 일치하는 key가 둘 이상 포함되어 있으면 lookup 및 mutation operation은 `SpreadsheetRepositoryKeyConflictError`를 throw합니다.

script-lock guard는 opt-in입니다. 동일한 Apps Script 프로젝트의 execution이 수행하는 repository mutation을 serialize하고, lock을 release하기 전에 `SpreadsheetApp.flush()`를 호출합니다. 같은 Spreadsheet에 접근하는 서로 다른 Apps Script 프로젝트는 이 guard로 coordination되지 않습니다.

## Storage와 Domain Conversion 분리

domain conversion에는 row codec을, physical layout에는 storage codec을 사용하세요. 예를 들어 packed JSON storage가 `Date` object를 보존한다고 가정하지 말고 row codec에서 `Date`를 string 또는 number로 변환합니다. 이렇게 하면 논리 row 계약이 명확해지고 `columns`와 packed storage mode에서 일관된 동작을 유지할 수 있습니다.
