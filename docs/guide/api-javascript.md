---
outline: deep
---

# JavaScript API

`@vegasjs/vegas` publishes a small set of package entry points for configuration, browser code, server-side data helpers, and test adapters.

Use these package entry points instead of importing implementation files from `src` or `dist` directly.

| Entry point                 | Public surface                                                                  |
| --------------------------- | ------------------------------------------------------------------------------- |
| `@vegasjs/vegas`            | Project configuration through `defineConfig()` and exported configuration types |
| `@vegasjs/vegas/client`     | Typed `google.script.run` client                                                |
| `@vegasjs/vegas/server`     | Typed Spreadsheet data APIs                                                     |
| `@vegasjs/vegas/vitest`     | Local Runtime Vitest adapter and test-facing runtime types                      |
| `@vegasjs/vegas/playwright` | Browser test adapter and Playwright `expect`                                    |

## `@vegasjs/vegas`

### `defineConfig()`

Use `defineConfig()` when authoring a Vegas configuration file:

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appType: "spa",
  appsScript: {
    manifest: {},
  },
});
```

The helper preserves the supplied configuration value and provides overloads for a direct `UserConfig`, a `Promise<UserConfig>`, or a `UserConfigFactory`.

The root entry point also exports these configuration types:

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

See [Configuring Vegas](../config/) for the configuration model and [Shared Options](../config/shared-options) for option-level documentation.

## `@vegasjs/vegas/client`

Use `createRpcClient<T>()` with an `rpc` registry exported by the server.

### `createRpcClient<T>()`

```typescript
function createRpcClient<T extends object>(): RpcClient<T>;
```

`RpcClient<T>` is the public client type returned by `createRpcClient<T>()`. The legacy `createServerFunctionClient()` factory and `ServerFunctionClient<T>` type alias were removed in v0.3.0.

To migrate, export a registry named `rpc` from the server and replace `createServerFunctionClient<T>()` with `createRpcClient<T>()` in the client.

Registered RPC handlers use one GAS entry point, `vegasRpcCall`, instead of requiring a named export for every method. Keep the contract independent of server implementation:

```typescript
// src/contracts/rpc.ts
export interface ServerRpc {
  greet(name: string): string;
}
```

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
import { createRpcClient, type RpcClient } from "@vegasjs/vegas/client";

import type { ServerRpc } from "../contracts/rpc";

const server: RpcClient<ServerRpc> = createRpcClient<ServerRpc>();
const result = await server.greet("Vegas");
```

The server entry must export an object named `rpc`. Vegas exposes its methods through the dispatcher in both local and Google Apps Script execution. Top-level named exports remain available to Apps Script itself, but Vegas clients use the registered `rpc` dispatcher. The names `vegasRpcCall` (global dispatcher) and `rpc` (handler export) have special meaning when using this mode; do not export a function named `vegasRpcCall` alongside `rpc`.

`defineServerFunctions()` and `RpcClient<T>` both check registered RPC contracts statically against a conservative `google.script.run` transport subset. Methods with incompatible signatures are excluded from `RpcClient<T>`. Supported values include: strings, numbers, booleans, `null`, arrays, and plain data records. TypeScript rejects `Date`, callbacks, `Promise` results, optional `undefined` fields, broad `object` / `{}` types, and recursive object types. A `void` return is allowed. Static typing cannot establish that a number is finite or that an object has no cyclic references.

Vegas also validates registered RPC values at runtime. `createRpcClient()` checks arguments before calling `google.script.run`, and the generated `vegasRpcCall` dispatcher checks incoming arguments and handler return values. Unsupported values include `Date`, functions, symbols, accessors, cyclic references, non-finite numbers, sparse arrays, non-enumerable data properties, and objects with custom prototypes. A root `undefined` result is allowed for void-style handlers. These checks do not serialize values or guarantee that Google accepts every permitted value. Convert dates to strings before transferring them.

Handler names ending in `_` and the names `then`, `constructor`, `prototype`, and `__proto__` are reserved. Registration, the client proxy, and the GAS dispatcher reject these names.

## `@vegasjs/vegas/server`

The server entry point contains Vegas's typed Spreadsheet data layer. See [Spreadsheet Data](./spreadsheet-data) for usage, storage semantics, querying, and repository behavior.

### Row, schema, and table APIs

Runtime exports:

```text
createSpreadsheetRowCodec
createSpreadsheetColumn
createSpreadsheetSchema
createSpreadsheetTable
```

Types:

```text
SpreadsheetRowCodec
SpreadsheetColumn
SpreadsheetSchema
SpreadsheetSchemaColumnSource
SpreadsheetTable
SpreadsheetTableEntry
SpreadsheetTableOptions
```

### Query APIs

Runtime exports:

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

Types:

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

### Storage APIs

Runtime exports:

```text
createSpreadsheetStorageLayout
createSpreadsheetStorageCodec
```

Types:

```text
SpreadsheetStorageLayout
SpreadsheetStorageLayoutOptions
SpreadsheetStorageLocation
SpreadsheetStorageMode
SpreadsheetStorageCodec
```

### Repository APIs

Runtime exports:

```text
createSpreadsheetRepository
createSpreadsheetRepositoryLockGuard
createSpreadsheetRepositoryScriptLockGuard
SpreadsheetRepositoryKeyConflictError
```

Types:

```text
SpreadsheetRepository
SpreadsheetRepositoryMutationGuard
SpreadsheetRepositoryOptions
SpreadsheetRepositoryLock
SpreadsheetRepositoryLockGuardOptions
SpreadsheetRepositoryScriptLockGuardOptions
```

## `@vegasjs/vegas/vitest`

The Vitest entry point exports `createLocalRuntimeTest()` together with the types needed to describe its fixture and inline Runtime Data.

Runtime export:

```text
createLocalRuntimeTest
```

Types:

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

See [Vitest](./vitest) for lifecycle, Runtime Data, isolation, and examples.

## `@vegasjs/vegas/playwright`

The Playwright entry point exports the browser test adapter and re-exports Playwright's `expect`.

Runtime exports:

```text
createBrowserTest
expect
```

Types:

```text
BrowserTestFixture
BrowserTestOptions
RuntimeDataFixture
```

See [Playwright](./playwright) for browser lifecycle, `vegas.app`, Runtime Data, and the cross-origin local web-app model.

## Public API Boundary

The package export map defines the supported import boundaries listed on this page. Internal implementation modules are free to change without becoming package-level APIs merely because their source files are present in the repository.

When an API has a dedicated guide, this reference lists the public symbols while the guide remains the source for lifecycle and behavior.
