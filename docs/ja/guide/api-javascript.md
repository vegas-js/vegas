---
outline: deep
---

# JavaScript API

`@vegasjs/vegas` は、設定・browser code・サーバー側data helper・test adapter向けに、少数のpackage entrypointを公開しています。

`src` や `dist` 内の実装ファイルを直接importするのではなく、ここに記載するpackage entrypointを使用してください。

| Entrypoint                  | 公開surface                                              |
| --------------------------- | -------------------------------------------------------- |
| `@vegasjs/vegas`            | `defineConfig()` と公開config typeによるプロジェクト設定 |
| `@vegasjs/vegas/client`     | 型付き `google.script.run` client                        |
| `@vegasjs/vegas/server`     | 型付き Spreadsheet data API                              |
| `@vegasjs/vegas/vitest`     | Local Runtime Vitest adapterとテスト向けRuntime type     |
| `@vegasjs/vegas/playwright` | Browser test adapterと Playwright `expect`               |

## `@vegasjs/vegas`

### `defineConfig()`

Vegas の設定ファイルを作成するときは `defineConfig()` を使用できます。

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appType: "spa",
  appsScript: {
    manifest: {},
  },
});
```

helperは指定された設定値を維持し、直接の `UserConfig`、`Promise<UserConfig>`、`UserConfigFactory` に対するoverloadを提供します。

root entrypointからは次のconfig typeも公開されています。

```typescript
import type {
  AppsScriptConfig,
  AppsScriptManifest,
  DevServerConfig,
  UserConfig,
  UserConfigExport,
  UserConfigFactory,
} from "@vegasjs/vegas";
```

設定modelについては [Vegas の設定](../config/) を、個々のoptionについては [共有オプション](../config/shared-options) を参照してください。

## `@vegasjs/vegas/client`

### `createServerFunctionClient<T>()`

```typescript
function createServerFunctionClient<T extends object>(): ServerFunctionClient<T>;
```

`createServerFunctionClient<T>()` は `google.script.run` 上に型付きのPromise-based clientを作成します。

```typescript
import { createServerFunctionClient } from "@vegasjs/vegas/client";

import type * as serverFunctions from "../server/Code";

const server = createServerFunctionClient<typeof serverFunctions>();

const result = await server.myFunction("value");
```

`ServerFunctionClient<T>` は `T` のstring-keyed functionを対象にし、名前が `_` で終わるfunctionを除外し、各functionのargument tupleを維持したまま、resultを `Promise<Awaited<Result>>` に変換します。

clientは `google.script.run.withSuccessHandler()` からresolveし、`withFailureHandler()` からrejectします。

entrypointからは次を公開しています。

```typescript
import { createServerFunctionClient, type ServerFunctionClient } from "@vegasjs/vegas/client";
```

## `@vegasjs/vegas/server`

server entrypointには Vegas の型付き Spreadsheet data layerが含まれています。使い方、storage semantics、query、repositoryの挙動については [Spreadsheet Data](./spreadsheet-data) を参照してください。

### Row / Schema / Table API

Runtime export:

```text
createSpreadsheetRowCodec
createSpreadsheetColumn
createSpreadsheetSchema
createSpreadsheetTable
```

Type:

```text
SpreadsheetRowCodec
SpreadsheetColumn
SpreadsheetSchema
SpreadsheetSchemaColumnSource
SpreadsheetTable
SpreadsheetTableEntry
SpreadsheetTableOptions
```

### Query API

Runtime export:

```text
createSpreadsheetQuery
createSpreadsheetQueryFields
createSpreadsheetQueryPlan
spreadsheetOrderBy
spreadsheetAnd
spreadsheetOr
spreadsheetEq
spreadsheetNe
spreadsheetGt
spreadsheetGte
spreadsheetLt
spreadsheetLte
```

Type:

```text
SpreadsheetQuery
SpreadsheetQueryField
SpreadsheetComparableQueryField
SpreadsheetQueryFields
SpreadsheetQueryExpression
SpreadsheetComparisonExpression
SpreadsheetComparisonKind
SpreadsheetComparableValue
SpreadsheetAndExpression
SpreadsheetOrExpression
SpreadsheetEqualExpression
SpreadsheetNotEqualExpression
SpreadsheetGreaterThanExpression
SpreadsheetGreaterThanOrEqualExpression
SpreadsheetLessThanExpression
SpreadsheetLessThanOrEqualExpression
SpreadsheetOrderBy
SpreadsheetQueryPlan
SpreadsheetQueryPlanOptions
SpreadsheetQueryPlanSource
SpreadsheetSortDirection
```

### Storage API

Runtime export:

```text
createSpreadsheetStorageLayout
createSpreadsheetStorageCodec
```

Type:

```text
SpreadsheetStorageLayout
SpreadsheetStorageLayoutOptions
SpreadsheetStorageLocation
SpreadsheetStorageMode
SpreadsheetStorageCodec
```

### Repository API

Runtime export:

```text
createSpreadsheetRepository
createSpreadsheetRepositoryLockGuard
createSpreadsheetRepositoryScriptLockGuard
SpreadsheetRepositoryKeyConflictError
```

Type:

```text
SpreadsheetRepository
SpreadsheetRepositoryMutationGuard
SpreadsheetRepositoryOptions
SpreadsheetRepositoryLock
SpreadsheetRepositoryLockGuardOptions
SpreadsheetRepositoryScriptLockGuardOptions
```

## `@vegasjs/vegas/vitest`

Vitest entrypointは `createLocalRuntimeTest()` と、fixtureやinline Runtime Dataを記述するために必要なtypeを公開します。

Runtime export:

```text
createLocalRuntimeTest
```

Type:

```text
LocalRuntimeTestOptions
LocalRuntimeHarness
LocalRuntimeProject
RuntimeDataFixture
LocalRuntime
Program
RuntimeExecutionRequest
RuntimeDataProperties
RuntimeDataSession
RuntimeDataSpreadsheet
RuntimeDataSpreadsheetCellValue
RuntimeDataSpreadsheetSheet
```

ライフサイクル、Runtime Data、分離、使用例については [Vitest](./vitest) を参照してください。

## `@vegasjs/vegas/playwright`

Playwright entrypointはbrowser test adapterを公開し、Playwright の `expect` をre-exportします。

Runtime export:

```text
createBrowserTest
expect
```

Type:

```text
BrowserTestFixture
BrowserTestOptions
RuntimeDataFixture
```

browserのライフサイクル、`vegas.app`、Runtime Data、cross-originのローカル Web app modelについては [Playwright](./playwright) を参照してください。

## Public API の境界

package export mapが、このページに記載する対応import boundaryを定義します。内部実装moduleは、source fileがrepository内に存在するだけでpackage levelのAPIになるわけではなく、自由に変更される可能性があります。

専用guideを持つAPIについては、このreferenceでは公開symbolを一覧化し、ライフサイクルや挙動についてはguideをsource of truthとします。
