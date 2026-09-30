---
outline: deep
---

# JavaScript API

`@vegasjs/vegas`는 설정, browser code, 서버 측 data helper, test adapter를 위해 소수의 package entry point를 공개합니다.

`src` 또는 `dist` 내부의 구현 파일을 직접 import하지 말고 이 페이지에 설명된 package entry point를 사용하세요.

| Entry point                 | Public surface                                           |
| --------------------------- | -------------------------------------------------------- |
| `@vegasjs/vegas`            | `defineConfig()`와 공개 config type을 통한 프로젝트 설정 |
| `@vegasjs/vegas/client`     | typed `google.script.run` client                         |
| `@vegasjs/vegas/server`     | typed Spreadsheet data API                               |
| `@vegasjs/vegas/vitest`     | Local Runtime Vitest adapter와 테스트용 Runtime type     |
| `@vegasjs/vegas/playwright` | Browser test adapter와 Playwright `expect`               |

## `@vegasjs/vegas`

### `defineConfig()`

Vegas 설정 파일을 작성할 때 `defineConfig()`를 사용할 수 있습니다.

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appType: "spa",
  appsScript: {
    manifest: {},
  },
});
```

helper는 전달된 설정 값을 유지하고 직접 `UserConfig`, `Promise<UserConfig>`, `UserConfigFactory`에 대한 overload를 제공합니다.

root entry point는 다음 config type도 export합니다.

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

설정 model은 [Vegas 설정](../config/)을, 개별 option은 [공통 옵션](../config/shared-options)을 참고하세요.

## `@vegasjs/vegas/client`

### `createServerFunctionClient<T>()`

```typescript
function createServerFunctionClient<T extends object>(): ServerFunctionClient<T>;
```

`createServerFunctionClient<T>()`는 `google.script.run` 위에 typed Promise-based client를 만듭니다.

```typescript
import { createServerFunctionClient } from "@vegasjs/vegas/client";
import type * as serverFunctions from "../server/Code";

const server = createServerFunctionClient<typeof serverFunctions>();

const result = await server.myFunction("value");
```

`ServerFunctionClient<T>`는 `T`의 string-keyed function을 대상으로 하며, 이름이 `_`로 끝나는 function을 제외하고, 각 function의 argument tuple을 유지하면서 result를 `Promise<Awaited<Result>>`로 변환합니다.

client는 `google.script.run.withSuccessHandler()`에서 resolve하고 `withFailureHandler()`에서 reject합니다.

entry point는 다음을 export합니다.

```typescript
import { createServerFunctionClient, type ServerFunctionClient } from "@vegasjs/vegas/client";
```

## `@vegasjs/vegas/server`

server entry point에는 Vegas의 typed Spreadsheet data layer가 포함되어 있습니다. 사용법, storage semantics, query, repository 동작은 [Spreadsheet Data](./spreadsheet-data)를 참고하세요.

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

Vitest entry point는 `createLocalRuntimeTest()`와 fixture 및 inline Runtime Data를 설명하는 데 필요한 type을 export합니다.

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

lifecycle, Runtime Data, 격리, 사용 예는 [Vitest](./vitest)를 참고하세요.

## `@vegasjs/vegas/playwright`

Playwright entry point는 browser test adapter를 export하고 Playwright의 `expect`를 re-export합니다.

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

browser lifecycle, `vegas.app`, Runtime Data, cross-origin 로컬 Web app model은 [Playwright](./playwright)를 참고하세요.

## Public API 경계

package export map이 이 페이지에 나열된 지원 import boundary를 정의합니다. 내부 구현 module은 repository에 source file이 존재한다는 이유만으로 package-level API가 되는 것이 아니며 자유롭게 변경될 수 있습니다.

전용 guide가 있는 API는 이 reference에서 public symbol을 나열하고, lifecycle과 동작은 해당 guide를 source of truth로 합니다.
