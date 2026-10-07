---
outline: deep
---

# Google Apps Script Runtime

Vegas can route server-function invocations from the local web application to Google Apps Script instead of executing them through the Local Runtime. The backend uses the Google Apps Script API `scripts.run` endpoint and the same server-function invocation model described in [Runtime Architecture](./runtime-architecture).

This backend is for intentionally running code that already exists in a Google Apps Script project. It does not upload the current in-memory local server build before each call, and it does not replace the rest of the Vegas local development environment.

## Google-Side Requirements

Google requires several pieces of setup before `scripts.run` can execute a function:

- The Apps Script project must be deployed as an **API executable**.
- The Apps Script project and the OAuth client used by Vegas must share the same **standard Google Cloud project**.
- The Google Apps Script API must be enabled in that Cloud project.
- The OAuth token must include the scopes required by the script.

Google's setup guide is the source of truth for these platform requirements: [Execute functions with the Google Apps Script API](https://developers.google.com/apps-script/api/how-tos/execute).

Vegas currently authenticates this backend with user OAuth credentials created by `vegas auth login`. Google documents that the Apps Script API does not support service accounts for this execution path.

## Configure the Backend

Set `appsScript.serverFunctions.backend` to `"google"` and provide the Apps Script project ID and the scopes required by the script:

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
      oauthScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    },
  },
});
```

`appsScript.manifest.oauthScopes` serves two purposes for this workflow:

- It is written to the Apps Script manifest during a production build.
- Vegas requires the selected authentication profile to have each configured scope before making a Google-backed server-function call.

See [Shared Options](../config/shared-options#appsscriptserverfunctions) for the complete configuration reference.

## Authenticate with the Required Scopes

Authenticate with the same profile configured for the Google backend and request each scope the script needs:

```sh
vegas auth login ./client-secret.json \
  --profile work \
  --scope https://www.googleapis.com/auth/drive.readonly
```

Vegas always includes the Apps Script project-management scope used by its Apps Script tooling. Additional scopes needed by the script must be requested explicitly with `--scope`.

If the stored credentials do not contain every scope listed in `appsScript.manifest.oauthScopes`, Vegas fails before sending the execution request and asks you to authenticate that profile again with the missing scopes.

Vegas also refreshes an access token when the cached token does not have enough remaining lifetime for a Google Apps Script execution request.

See [Command Line Interface](./cli#authentication) for the general authentication workflow.

## Which Code Executes

The Google backend executes code from the configured Google Apps Script project. It does not execute the local server artifact currently held by `vegas` or `vegas preview`.

To update the remote project with the current Vegas production output:

```sh
vegas build
vegas push
```

`vegas push` updates the Apps Script project files but does not create or update an API executable deployment. Deployment management remains a Google Apps Script operation.

### `devMode: false`

`devMode` defaults to `false`. Google executes the version associated with the API executable deployment. After pushing new source, update the API executable deployment when you want normal Google-backed calls to use a newly deployed version.

### `devMode: true`

Set `devMode` to `true` when you intentionally want Google to execute the most recently saved project code instead of the deployed version:

```typescript
export default defineConfig({
  appsScript: {
    scriptId: "your-script-id",
    serverFunctions: {
      backend: "google",
      profile: "work",
      devMode: true,
    },
    manifest: {
      oauthScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    },
  },
});
```

Google restricts development-mode execution to the script owner.

## Parameters and Return Values

Before sending a request, Vegas normalizes server-function arguments to values that can cross the Apps Script API boundary. Supported argument values are:

- `null`
- strings
- booleans
- finite numbers
- dense arrays containing supported values
- plain objects with string keys and supported values

Vegas rejects unsupported values before making the network request. Examples include `undefined`, functions, symbols, bigints, non-finite numbers, class instances, cyclic object graphs, sparse arrays, array accessors, object accessors, and symbol object keys.

Google also restricts `scripts.run` parameters and results to basic data types. Apps Script service objects such as a `Spreadsheet`, `Sheet`, or `Document` cannot be passed across this boundary. Return those objects as serializable application data instead.

## Errors

Vegas keeps application errors separate from failures in the Google execution machinery.

If the Apps Script function itself throws, Vegas reconstructs a normal JavaScript error from the error type, message, and documented Apps Script stack frames returned by Google.

Infrastructure failures use `RuntimeInfrastructureError` and are classified as:

| Kind             | Meaning                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `authentication` | Credentials, token acquisition, or authorization failed.                                               |
| `serialization`  | Function arguments cannot be represented by the Google execution request.                              |
| `timeout`        | The execution request exceeded the supported request lifetime or Google reported an execution timeout. |
| `backend`        | The request could not be sent or Google rejected it outside the normal script-error response.          |
| `protocol`       | Google returned a response that Vegas could not interpret as a valid execution result.                 |

This separation lets application exceptions behave like application exceptions while still making transport and authentication failures distinguishable.

## Relationship to Local Runtime

Selecting the Google backend only changes server-function invocation from the local web application. Vegas still runs its local development server, client build, browser bridge, file watching, and Local Runtime lifecycle.

Use [Local Runtime](./local-runtime) when you want fast local execution against Vegas's modeled Apps Script APIs. Use the Google backend when you intentionally want a server-function call to cross the Google Apps Script API boundary and run in the configured remote project.
