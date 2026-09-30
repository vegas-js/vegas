---
outline: deep
---

# Playwright

Vegas provides a Playwright adapter for browser-level tests against the local web application and Local Runtime.

The adapter is exported from `@vegasjs/vegas/playwright`. It creates an isolated browser harness for each test, starts the local web application on ephemeral origins, and exposes the rendered user application through a single `Locator`.

## Install Playwright

Playwright is an optional peer dependency of `@vegasjs/vegas`, so install it in projects that use the browser test adapter:

```sh
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Install the browsers your Playwright configuration uses. Vegas does not choose the browser for the test run; normal Playwright configuration controls that.

## Basic Test

Create a test API with `createBrowserTest()` and interact with the application through `vegas.app`:

```typescript
import { createBrowserTest, expect } from "@vegasjs/vegas/playwright";

const test = createBrowserTest();

test("updates the greeting", async ({ vegas }) => {
  await vegas.app.getByRole("button", { name: "Update greeting" }).click();

  await expect(vegas.app.locator("#result")).toHaveText("Hello from Vegas");
});
```

`vegas.app` is a Playwright `Locator` rooted at the body of the user HTML document. Use normal locator chaining and Playwright assertions from that root.

Vegas deliberately hides the internal iframe structure from the browser fixture. Application tests normally do not need to know how the host, sandbox, and user HTML frames are nested.

## What the Browser Harness Exercises

Each Playwright test created by `createBrowserTest()` uses the Vegas local browser harness. The harness:

1. loads the selected Vegas project,
2. builds the server program in development mode,
3. creates a fresh Local Runtime from the inline Runtime Data fixture,
4. starts the local host and user-content servers on ephemeral ports,
5. opens the host application in the Playwright `page`, and
6. waits for the user HTML frame to be injected before exposing `vegas.app`.

Client calls through `google.script.run` cross the local browser bridge and execute through that test's Local Runtime.

The Playwright adapter does not route server-function calls to the Google Apps Script backend, even when the project uses Google-backed server functions during normal development. Browser tests are Local Runtime tests.

## Host Page and Application Locator

The test API still includes Playwright's built-in fixtures. In particular, `page` refers to the outer Vegas host page, while `vegas.app` refers to the user application rendered inside the nested user-content frame.

```typescript
const test = createBrowserTest();

test("can inspect the host and the application", async ({ page, vegas }) => {
  expect(new URL(page.url()).pathname).toBe("/dev");
  await expect(vegas.app.locator("main")).toBeVisible();
});
```

Use `vegas.app` for normal application interaction. Use `page` when a test intentionally needs host-level navigation, request APIs, or other Playwright facilities outside the user HTML document.

## Select the Vegas Project

By default, `createBrowserTest()` loads the Vegas project from the current working directory.

Use `root` when the browser test should load another Vegas project root:

```typescript
const test = createBrowserTest({
  root: "./examples/app",
});
```

The selected project supplies the local web application and server program used by the browser harness.

## Seed Runtime Data

Use the `runtimeData` option to seed Local Runtime state for the test:

```typescript
import { createBrowserTest, type RuntimeDataFixture } from "@vegasjs/vegas/playwright";

const runtimeData = {
  properties: {
    scriptProperties: {
      environment: "browser-test",
    },
  },
  session: {
    activeUserEmail: "tester@example.com",
  },
} satisfies RuntimeDataFixture;

const test = createBrowserTest({ runtimeData });
```

The inline fixture uses the same validated Properties, Session, and Spreadsheet shapes as the Vitest adapter and Local Runtime snapshot model.

The Playwright adapter does **not** automatically load modules from the project's `runtime/` directory. Pass browser-test state explicitly with `runtimeData`.

## Test Isolation

Each test gets a new browser harness, Local Runtime, runtime session, in-memory stores, and ephemeral local servers. The harness is disposed after the test finishes.

Runtime mutations therefore do not become the starting state of the next browser test:

```typescript
const test = createBrowserTest({
  runtimeData: {
    properties: {
      scriptProperties: {
        prefix: "Vegas",
      },
    },
  },
});

test("can mutate runtime state", async ({ vegas }) => {
  await vegas.app.getByRole("button", { name: "Change prefix" }).click();
  await expect(vegas.app.locator("#result")).toHaveText("Changed");
});

test("starts from the fixture again", async ({ vegas }) => {
  await expect(vegas.app.locator("#result")).toHaveText("Vegas");
});
```

This isolation is test-scoped. It does not persist Local Runtime mutations back to Runtime Data files.

## Cross-Origin Web App Model

The browser harness runs the Vegas host and user-content application on separate ephemeral origins. The user HTML remains behind the same cross-origin iframe and message-bridge model used by local web-app development.

That makes the Playwright adapter useful for behavior that a server-only test cannot cover, including:

- browser rendering and interaction,
- client-to-server `google.script.run` calls,
- the Vegas browser bridge,
- iframe and cross-origin integration behavior,
- host-level HTTP behavior when combined with Playwright's `page` and request APIs.

The exact ephemeral ports are intentionally not part of the test contract.

## Playwright Assertions

`@vegasjs/vegas/playwright` re-exports Playwright's `expect`, so tests can import the test adapter and browser assertions from the same entry point:

```typescript
import { createBrowserTest, expect } from "@vegasjs/vegas/playwright";
```

You can still import other Playwright APIs from `@playwright/test` normally.

## Vitest or Playwright?

Use [Vitest](./vitest) when the behavior can be tested by executing server functions directly through the Local Runtime. It avoids starting browsers and local web servers.

Use Playwright when the behavior depends on the browser application, `google.script.run`, the web-app bridge, cross-origin framing, or host-level HTTP behavior.

Both adapters use explicit inline Runtime Data and create isolated Local Runtime state for tests. See [Local Runtime](./local-runtime) for Runtime Data semantics and runtime behavior policy.
