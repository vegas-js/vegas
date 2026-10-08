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

새 프로젝트에서는 서버가 export하는 `rpc` 레지스트리와 `createRpcClient<T>()` 사용을 권장합니다. `createServerFunctionClient<T>()`는 더 이상 권장되지 않지만 기존 이름 지정 함수 클라이언트와의 호환성을 위해 유지됩니다.

### `createServerFunctionClient<T>()` (deprecated)

```typescript
function createServerFunctionClient<T extends object>(): ServerFunctionClient<T>;
```

`createServerFunctionClient<T>()`는 `google.script.run` 위에 typed Promise-based client를 만듭니다.

먼저 server 구현과 독립적인 RPC 계약을 정의합니다.

```typescript
// src/contracts/rpc.ts
export interface ServerRpc {
  greet(name: string): string;
}
```

server에서는 계약을 만족하는 함수를 구현하고 GAS Bridge를 위해 이름 있는 export로 노출합니다.

```typescript
// src/server/Code.ts
import { defineServerFunctions } from "@vegasjs/vegas/server";

import type { ServerRpc } from "../contracts/rpc";

export const { greet } = defineServerFunctions<ServerRpc>({
  greet(name) {
    Logger.log(name);
    return `Hello, ${name}`;
  },
});
```

client는 공유 RPC 계약의 타입만 참조합니다.

```typescript
// src/client/main.ts
import { createServerFunctionClient } from "@vegasjs/vegas/client";

import type { ServerRpc } from "../contracts/rpc";

const server = createServerFunctionClient<ServerRpc>();
const result = await server.greet("Vegas");
```

이 방식은 Vegas 실행, 타입 파일 생성, TypeScript Project References가 필요하지 않습니다. `../server/Code`를 `import type`으로 참조해도 client 설정으로 server 구현을 검사하므로 피해야 합니다. `defineServerFunctions()`는 타입 검사와 함께 등록 시 핸들러 이름과 함수 값을 검증한 뒤 원래 객체를 반환합니다. 기존 방식의 GAS 함수 공개에는 이름 있는 export가 필요합니다.

`ServerFunctionClient<T>`는 `T`의 string-keyed function을 대상으로 하며, 이름이 `_`로 끝나는 function을 제외하고, 각 function의 argument tuple을 유지하면서 result를 `Promise<Awaited<Result>>`로 변환합니다.

client는 `google.script.run.withSuccessHandler()`에서 resolve하고 `withFailureHandler()`에서 reject합니다.

entry point는 다음을 export합니다.

```typescript
import { createServerFunctionClient, type ServerFunctionClient } from "@vegasjs/vegas/client";
```

### `createRpcClient<T>()`

등록형 RPC는 각 메서드를 개별 이름으로 export하는 대신 하나의 GAS 진입점인 `vegasRpcCall`을 사용합니다. 공개 계약은 server 구현과 분리합니다.

```typescript
// src/server/Code.ts
import { defineServerFunctions } from "@vegasjs/vegas/server";

import type { ServerRpc } from "../contracts/rpc";

export const rpc = defineServerFunctions<ServerRpc>({
  greet(name) {
    Logger.log(name);
    return `Hello, ${name}`;
  },
});
```

```typescript
// src/client/main.ts
import { createRpcClient } from "@vegasjs/vegas/client";

import type { ServerRpc } from "../contracts/rpc";

const server = createRpcClient<ServerRpc>();
const result = await server.greet("Vegas");
```

server 엔트리는 `rpc`라는 이름으로 객체를 export해야 합니다. Vegas는 Local Runtime과 Google Apps Script 양쪽에서 디스패처를 통해 해당 메서드를 실행합니다. 기존 named export와 `createServerFunctionClient()`도 계속 지원됩니다. 이 방식에서는 `rpc`가 핸들러 export 이름이며 `vegasRpcCall`이 GAS 디스패처 이름이므로, `rpc`와 함께 `vegasRpcCall` 함수를 export하지 마세요.

등록형 RPC 계약은 `google.script.run`으로 전달 가능한 값의 보수적인 부분집합(문자열, 숫자, 불리언, `null`, 배열, 일반 데이터 객체)에 대해 정적으로 검사됩니다. TypeScript는 `Date`, 콜백, `Promise` 반환값, 선택적 `undefined` 프로퍼티, 지나치게 넓은 `object` / `{}` 타입, 재귀 객체 타입을 거부합니다. `void` 반환값은 허용됩니다. 정적 타입 검사만으로는 숫자가 유한한지 또는 객체에 순환 참조가 없는지 증명할 수 없습니다.

Vegas는 등록형 RPC 값도 런타임에 검증합니다. `createRpcClient()`는 `google.script.run`을 호출하기 전에 인수를 검증하고, 생성된 `vegasRpcCall` 디스패처는 전달받은 인수와 핸들러 반환값을 검증합니다. `Date`, 함수, 심벌, 접근자, 순환 참조, 유한하지 않은 숫자, 희소 배열, 열거 불가능한 데이터 프로퍼티, 사용자 정의 프로토타입을 가진 객체 등은 거부됩니다. `void` 형식의 핸들러에서는 최상위 `undefined` 반환값을 허용합니다. 이 검증은 값을 직렬화하지 않으며 Google이 허용된 모든 값을 받아들인다고 보장하지도 않습니다. 기존 `createServerFunctionClient()`에는 이 추가 인수 검증이 적용되지 않습니다. 날짜는 문자열로 변환해 전달하세요.

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
