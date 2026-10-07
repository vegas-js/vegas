---
outline: deep
---

# Vitest

Vegas provides a Vitest adapter for testing server-side code against the Local Runtime without starting the development server or a browser.

The adapter is exported from `@vegasjs/vegas/vitest`. It loads the Vegas project, builds the server program in development mode, and provides a fresh Local Runtime harness to each test.

## Install Vitest

Vitest is an optional peer dependency of `@vegasjs/vegas`, so install it in projects that use the test adapter:

```sh
pnpm add -D vitest
```

The adapter currently supports Vitest 5.

## Basic Test

Create a test API with `createLocalRuntimeTest()` and use the `vegas` fixture to execute a server function by name:

```typescript
import { createLocalRuntimeTest } from "@vegasjs/vegas/vitest";
import { expect } from "vitest";

const test = createLocalRuntimeTest();

test("greets a user", async ({ vegas }) => {
  await expect(vegas.appsScript.execute("greet", ["Ada"])).resolves.toBe("Hello, Ada");
});
```

`vegas.appsScript.execute()` accepts the function name and an optional array of arguments. The return value is the value produced by the Local Runtime execution.

The server program is built from the selected Vegas project. The test adapter does not start the Vegas development server, browser bridge, file watcher, or Google backend.

## Select the Vegas Project

By default, `createLocalRuntimeTest()` loads the Vegas project from the current working directory.

Use `root` when the test should load another Vegas project root:

```typescript
const test = createLocalRuntimeTest({
  root: "./examples/app",
});
```

Vegas loads the project configuration and builds its server program in development mode. That project/program environment is reused by the test API instead of being rebuilt for every individual test.

## Seed Runtime Data

Use the `runtimeData` option to provide the Local Runtime state needed by the test:

```typescript
import { createLocalRuntimeTest, type RuntimeDataFixture } from "@vegasjs/vegas/vitest";

const runtimeData = {
  properties: {
    scriptProperties: {
      environment: "test",
    },
  },
  session: {
    activeUserEmail: "tester@example.com",
    activeUserLocale: "en",
  },
  spreadsheets: [
    {
      id: "budget",
      name: "Budget",
      sheets: [
        {
          id: 0,
          name: "Sheet1",
          maxRows: 20,
          maxColumns: 10,
          values: [
            ["Item", "Amount"],
            ["Hosting", 25],
          ],
        },
      ],
    },
  ],
} satisfies RuntimeDataFixture;

const test = createLocalRuntimeTest({ runtimeData });
```

The inline fixture supports the same validated Properties, Session, and Spreadsheet data shapes used by the Local Runtime snapshot model.

The Vitest adapter does **not** automatically load modules from the project's `runtime/` directory. Pass test state explicitly with `runtimeData`. Omitting `runtimeData` creates the test harness from an empty Runtime Data fixture.

## Test Isolation

Each test receives a newly seeded Local Runtime harness.

Mutations made through Apps Script APIs or through the exposed stores in one test do not become the starting state of the next test:

```typescript
const test = createLocalRuntimeTest({
  runtimeData: {
    properties: {
      scriptProperties: {
        prefix: "Vegas",
      },
    },
  },
});

test("can mutate state", async ({ vegas }) => {
  await vegas.appsScript.execute("setPrefix", ["Changed"]);

  await expect(vegas.appsScript.execute("getPrefix")).resolves.toBe("Changed");
});

test("starts from the fixture again", async ({ vegas }) => {
  await expect(vegas.appsScript.execute("getPrefix")).resolves.toBe("Vegas");
});
```

This isolation applies to the Local Runtime harness created for each test. The loaded Vegas project and built server program are shared by the test API, while mutable runtime state is recreated from the fixture.

## Harness Surface

The `vegas` fixture is a `LocalRuntimeHarness` with these surfaces:

| Property           | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| `appsScript`       | Execute a server function through the Local Runtime.         |
| `runtime`          | Access the underlying `LocalRuntime`.                        |
| `session`          | Access the `LocalRuntimeSession` owned by this test harness. |
| `propertiesStore`  | Inspect or mutate the in-memory Properties store directly.   |
| `spreadsheetStore` | Inspect or mutate the in-memory Spreadsheet store directly.  |

Application tests should normally exercise behavior through `appsScript.execute()`. The lower-level runtime and stores are available when a test needs direct state assertions or runtime-specific setup.

## Relationship to Local Runtime

The Vitest adapter uses the same Local Runtime implementation as Vegas development workflows, but with a test-owned lifecycle:

- the Vegas project and server program are loaded for the test API,
- inline Runtime Data is normalized into a snapshot,
- each test gets a new seeded runtime session and stores,
- server functions execute without a browser or development server.

See [Local Runtime](./local-runtime) for Runtime Data semantics, lifecycle concepts, behavior categories, and API coverage policy.
