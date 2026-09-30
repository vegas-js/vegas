---
outline: deep
---

# Runtime Architecture

Vegas separates the interface used to execute a server function from the backend that performs the execution. This lets the local web application use either the Vegas Local Runtime or a Google Apps Script project without changing the client-to-server invocation model.

## Runtime Backend Boundary

Internally, both execution paths implement the same runtime-backend contract. A request identifies a server function, supplies its arguments, and can carry invocation context and an abort signal. The backend resolves that request and returns the result asynchronously.

The shared boundary is intentionally small: code that dispatches a server-function invocation does not need to know whether the function runs locally or through Google Apps Script.

## Local Backend

The default backend is `local`.

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appsScript: {
    serverFunctions: {
      backend: "local",
    },
  },
});
```

Server functions execute through the Vegas Local Runtime using the current local server build. Runtime data and session-owned local resources are provided by the Local Runtime lifecycle.

This is the normal path for fast local development and is the backend used when `appsScript.serverFunctions` is omitted.

See [Local Runtime](./local-runtime) for the behavior model, auditing policy, and API coverage.

## Google Apps Script Backend

Set `appsScript.serverFunctions.backend` to `"google"` when server functions invoked from the local web application should execute through Google Apps Script instead.

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appsScript: {
    scriptId: "your-script-id",
    serverFunctions: {
      backend: "google",
      profile: "work",
    },
    manifest: {
      oauthScopes: ["https://www.googleapis.com/auth/script.projects"],
    },
  },
});
```

For this backend, Vegas acquires an access token through its Apps Script authentication support and sends the function invocation to the configured Apps Script project.

The Google backend requires:

- `appsScript.scriptId`.
- At least one non-empty entry in `appsScript.manifest.oauthScopes`.

The optional `profile` selects a named authentication profile. The optional `devMode` flag is forwarded with the Apps Script API execution request.

See [Google Apps Script Runtime](./google-apps-script-runtime) for Google-side prerequisites, authentication, code selection, serialization, and error behavior.

## What Backend Selection Changes

`appsScript.serverFunctions` selects the destination for server-function invocations made by the local web application.

It does **not** switch the entire Vegas development environment from local execution to Google infrastructure. Development and preview still start the Vegas local application, build local client and server artifacts, and maintain the Local Runtime used by the local application lifecycle.

When the backend is `google`, the local application routes server-function calls through the Google backend instead of the Local Runtime. Other local development responsibilities remain local.

## Development and Preview

Both `vegas` / `vegas dev` / `vegas serve` and `vegas preview` honor the configured server-function backend.

The difference between development and preview remains the build mode described in [Development and Build](./development-and-build). Backend selection is independent of whether the builder uses development or production mode.

## Build and Push

Runtime backend selection does not change production artifact generation or upload behavior:

- `vegas build` creates the production artifacts.
- `vegas push` uploads the current production output.

Neither command executes application server functions through the configured development backend as part of its normal workflow.

See [Shared Options](../config/shared-options#appsscriptserverfunctions) for the complete configuration reference.
