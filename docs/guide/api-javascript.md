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

### `createServerFunctionClient<T>()`

```typescript
function createServerFunctionClient<T extends object>(): ServerFunctionClient<T>;
```

`createServerFunctionClient<T>()` creates a typed Promise-based client over `google.script.run`.

Define the callable RPC contract independently of the server implementation:

```typescript
// src/contracts/rpc.ts
export interface ServerRpc {
  greet(name: string): string;
}
```

Implement that contract on the server, using named exports for the GAS bridge:

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

Reference only the shared contract from the client:

```typescript
// src/client/main.ts
import { createServerFunctionClient } from "@vegasjs/vegas/client";

import type { ServerRpc } from "../contracts/rpc";

const server = createServerFunctionClient<ServerRpc>();
const result = await server.greet("Vegas");
```

This works without a Vegas dev server, generated type files, or TypeScript Project References. Do not import `../server/Code` even with `import type`: TypeScript otherwise checks server implementation files using the client compiler settings. The exported server functions must remain top-level named exports; `defineServerFunctions()` only checks types and preserves the supplied object.

`ServerFunctionClient<T>` keeps string-keyed functions from `T`, excludes function names ending in `_`, preserves each function's argument tuple, and converts its result to `Promise<Awaited<Result>>`.

The client resolves from `google.script.run.withSuccessHandler()` and rejects from `withFailureHandler()`.

The entry point exports:

```typescript
import { createServerFunctionClient, type ServerFunctionClient } from "@vegasjs/vegas/client";
```

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
