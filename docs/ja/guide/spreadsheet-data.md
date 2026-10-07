---
outline: deep
---

# Spreadsheet Data

Vegas は、Google Sheets に構造化されたrowを保存するサーバー側コード向けに、型付きデータ層を提供します。API は `@vegasjs/vegas/server` から公開され、rowのencoding、query、物理storage、repository操作を明示的に扱えるよう設計されています。

このデータ層は `SpreadsheetApp` を置き換えるものではありません。Spreadsheet と Sheet は引き続き Apps Script API で選択し、その `Sheet` を Vegas のtableでwrapします。

## Row Schema を定義する

最初にrow codecと名前付きcolumnを定義します。codecはアプリケーションのrowと論理的なSpreadsheet値との変換を担当します。

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

schemaはcodecのwidthに対してcolumn名と論理indexを検証します。column indexは0始まりの論理indexで、tableが使用するSheet上の座標とは独立しています。

## Table を作成する

`GoogleAppsScript.Spreadsheet.Sheet` を `createSpreadsheetTable()` でwrapします。

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

`startRow` と `startColumn` は1始まりのSheet座標です。この例ではrow 1をheadingに使い、table dataをrow 2から開始できます。

Vegas は物理columnからtableの境界を決定します。物理cellがすべて空文字列である末尾rowはtableの外側ですが、空ではないtable rowの間にある空rowはtableの一部として残ります。rowの削除ではtableの物理rectangleだけをshiftするため、table widthの外側にあるcellはshiftされません。

## Row をqueryする

直接conditionを指定する場合はquery expression helperを使用します。

```typescript
import { spreadsheetEq } from "@vegasjs/vegas/server";

const activeUsers = getUserTable().query(spreadsheetEq(userSchema.columns.status, "active"));
```

ordering、limit、複数conditionを使用する場合は、型付きquery fieldとquery builderを作成します。

```typescript
import { createSpreadsheetQuery, createSpreadsheetQueryFields } from "@vegasjs/vegas/server";

const userFields = createSpreadsheetQueryFields(userSchema);

const query = createSpreadsheetQuery(userFields)
  .where((fields) => fields.status.eq("active"))
  .orderBy((fields) => fields.name.asc())
  .limit(100);

const rows = getUserTable().execute(query);
```

複数の `where()` は論理ANDで結合されます。複数の `orderBy()` はstable sort keyとして追加され、後から指定した `limit()` は以前のlimitを置き換えます。query builderはimmutableで、各methodが新しいqueryを返します。

Vegas は、`execute()` または `executeEntries()` と組み合わせて使われる対象可能なstatic query-builder chainを、ビルド時にdata-only query planへlowerできます。chainをlowerできない場合も、同じquery APIをRuntimeで使用できます。

## 物理 Storage Layout を選択する

既定では、各論理値が1つの物理Sheet columnを使用します。rowが広い場合は、packed layoutを明示的に選択できます。

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

Vegas は3つの生成layout modeを提供します。

- `columns`: すべての論理columnを物理Sheet columnとしてmaterializeします。
- `packed`: keyをmaterializeし、それ以外のすべての論理値を1つのJSON payload columnへ格納します。
- `indexed-packed`: keyと選択したcolumnをmaterializeし、残りの値を1つのJSON payload columnへ格納します。

materializeされたcolumnは、packed payloadをdecodeせずにquery pushdownやrepository key lookupで使用できます。packed valueはlosslessにJSON-compatibleである必要があります。`undefined`、非有限number、`bigint`、function、symbol、`Date` object、sparse array、循環構造、plainではないobjectなどは拒否されます。必要な場合はrow codec内で明示的に変換してください。

## Repository でKey付きMutationを行う

repositoryはtableにunique key lookupと、keyを指定したinsert・update・delete操作を追加します。tableをschemaから作成した場合は、その同じschemaのcolumnをkeyに使用してください。

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

repository keyは `Object.is()` に従って一意です。既存のSheet dataに一致するkeyが複数含まれている場合、lookupとmutation操作は `SpreadsheetRepositoryKeyConflictError` をthrowします。

script-lock guardはopt-inです。同じ Apps Script プロジェクトのexecutionが行うrepository mutationをserializeし、lockをreleaseする前に `SpreadsheetApp.flush()` を呼び出します。同じSpreadsheetへアクセスする別の Apps Script プロジェクトは、このguardではcoordinationされません。

## Storage と Domain Conversion を分離する

domain conversionにはrow codec、物理layoutにはstorage codecを使用してください。たとえばpacked JSON storageで `Date` objectが保持されることに依存するのではなく、row codecで `Date` をstringやnumberへ変換します。これにより論理rowの契約が明示され、`columns` とpacked storage modeの両方で一貫した挙動になります。
