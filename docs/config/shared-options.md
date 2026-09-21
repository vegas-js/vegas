# Shared Options

Unless noted, the options in this section are applied to all dev and build.

## root

- **Type:** `string`
- **Default:** `process.cwd()`

Project root directory. Can be an absolute path or a path relative to the current working directory.

When both the CLI root argument and `root` are specified, the CLI root takes precedence. If neither is specified, Vegas uses the current working directory.

## clientDir

- **Type:** `string`
- **Default:** `src/client`

The directory that serves as the starting point for exploring front-end programs.

## serverDir

- **Type:** `string`
- **Default:** `src/server` for `"spa"`, `src` for `"script"`

The directory that serves as the starting point for exploring server (Apps Script) programs.

For SPA projects, the default is `src/server`. For script projects, the default is `src`.

## runtimeDataDir

- **Type:** `string`
- **Default:** `runtime`

The directory that contains source data used by the local runtime.

## plugins

- **Type:** `PluginOption[]`

An array of plugins to use. This will be passed directly to Vite. For details about the plugins, please refer to the [Vite Plugin API](https://vite.dev/guide/api-plugin).

## appType

- **Type:** `"spa" | "script"`
- **Default:** `"spa"`

Defines the application type.

Use `"spa"` for applications with client entry points and `"script"` for Apps Script projects that do not require a client application.

## devServer

- **Type:** `object`

Local server configuration used by `vegas serve` and `vegas preview`. It does not affect production build output.

### devServer.host

- **Type:** `string | boolean`
- **Default:** `"localhost"`

Host name or IP address used by both Vegas local servers. Set this to `true` or `"0.0.0.0"` to listen on all addresses.

Exposing a local development server beyond localhost can make the local Apps Script runtime reachable from other devices, so only do this on a network you trust.

### devServer.port

- **Type:** `number`
- **Default:** `5173`

Preferred port for the main Vegas local server.

If the port is already in use, Vite can select the next available port. Vegas uses the port that the main server actually acquired when starting its paired user-content server.

A value of `0` allows the operating system to choose an available port.

### devServer.open

- **Type:** `boolean`
- **Default:** `false`

Whether to open the local web app in the browser when the main server starts.

For example:

```typescript
export default defineConfig({
  devServer: {
    host: true,
    port: 4173,
    open: true,
  },
});
```

## output

- **Type:** `object`

Build output configuration.

### output.dir

- **Type:** `string`
- **Default:** `dist`

Directory where production build artifacts are written. Relative paths are resolved from the project root.

By default, the output directory must be a child of the project root. The project root itself and its ancestors cannot be used as the output directory.

Vegas treats production output as authoritative. After a build succeeds, the existing output directory is removed before the new build artifacts are written.

### output.allowOutsideRoot

- **Type:** `boolean`
- **Default:** `false`

Allows `output.dir` to resolve outside the project root.

Vegas removes the existing output directory before writing a successful production build, so output outside the project root requires explicit opt-in.

This option does not allow the project root itself or any ancestor of the project root to be used as the output directory.

For example:

```typescript
export default defineConfig({
  output: {
    dir: "../dist",
    allowOutsideRoot: true,
  },
});
```

## appsScript

- **Type:** `object`

Apps Script project and manifest configuration.

### appsScript.scriptId

- **Type:** `string`

Apps Script project ID used as the target for `vegas push`.

When multiple script ID sources are available, Vegas uses the following precedence:

1. `VEGAS_SCRIPT_ID`
2. `appsScript.scriptId`
3. `.clasp.json` compatibility fallback

An explicitly configured empty script ID is treated as invalid and does not fall back to a lower-precedence source.

### appsScript.manifest

- **Type:** `object`

Apps Script manifest configuration written to `appsscript.json` during production builds.

Vegas currently supports the manifest fields documented below. Unknown manifest options are rejected during configuration loading.

#### appsScript.manifest.dependencies

- **Type:** `object`

Configures Apps Script advanced services and libraries.

##### appsScript.manifest.dependencies.enabledAdvancedServices

- **Type:** `object[]`

Advanced services enabled for the Apps Script project.

Each entry can contain:

- `serviceId`: `string`
- `userSymbol`: `string`
- `version`: `string`

##### appsScript.manifest.dependencies.libraries

- **Type:** `object[]`

Apps Script libraries used by the project.

Each entry can contain:

- `developmentMode`: `boolean`
- `libraryId`: `string`
- `userSymbol`: `string`
- `version`: `string`

#### appsScript.manifest.executionApi

- **Type:** `object`

API executable deployment configuration. This field is used when the Apps Script project is deployed for API execution.

##### appsScript.manifest.executionApi.access

- **Type:** `"MYSELF" | "DOMAIN" | "ANYONE" | "ANYONE_ANONYMOUS"`

Controls who can run the script through the Apps Script API. Vegas preserves this value in the generated `appsscript.json` and does not add a default when `executionApi` is omitted.

See the [Apps Script web apps and API executables manifest documentation](https://developers.google.com/apps-script/manifest/web-app-api-executable) for the access levels.

#### appsScript.manifest.exceptionLogging

- **Type:** `"NONE" | "STACKDRIVER"`
- **Default:** `"STACKDRIVER"`

Controls where Apps Script exceptions are logged.

#### appsScript.manifest.oauthScopes

- **Type:** `string[]`

OAuth scopes explicitly requested by the Apps Script project.

#### appsScript.manifest.runtimeVersion

- **Type:** `"STABLE" | "V8" | "DEPRECATED_ES5"`
- **Default:** `"V8"`

Apps Script runtime used by the generated project manifest.

#### appsScript.manifest.sheets

- **Type:** `object`

Google Sheets macro configuration.

##### appsScript.manifest.sheets.macros

- **Type:** `object[]`
- **Required when `sheets` is configured**

Each macro requires:

- `functionName`: `string`
- `menuName`: `string`

Each macro can optionally contain:

- `defaultShortcut`: `string`

Vegas validates the manifest structure and preserves macro definitions in the generated `appsscript.json`. Google Apps Script validates shortcut semantics such as the `Ctrl+Alt+Shift+Number` format.

See the [Apps Script Sheets macro manifest documentation](https://developers.google.com/apps-script/manifest/sheets) for macro requirements.

#### appsScript.manifest.timeZone

- **Type:** `string`
- **Default:** `"UTC"`

Time zone written to the Apps Script manifest.

#### appsScript.manifest.urlFetchWhitelist

- **Type:** `string[]`

HTTPS URL prefixes that Apps Script permits `UrlFetch` requests to access.

Vegas validates the configuration shape and preserves the prefixes in the generated `appsscript.json`. Google Apps Script validates the URL prefix requirements when the manifest is used.

The field name follows the Apps Script manifest API. Google now refers to this concept as an allowlist even though the manifest field remains named `urlFetchWhitelist`.

See the [Apps Script allowlist documentation](https://developers.google.com/apps-script/manifest/allowlist-url) for the required URL prefix format.

#### appsScript.manifest.webapp

- **Type:** `object`

Web app deployment configuration.

##### appsScript.manifest.webapp.access

- **Type:** `"MYSELF" | "DOMAIN" | "ANYONE" | "ANYONE_ANONYMOUS"`
- **Default:** `"MYSELF"`

Controls who can access the web app.

##### appsScript.manifest.webapp.executeAs

- **Type:** `"USER_ACCESSING" | "USER_DEPLOYING"`
- **Default:** `"USER_ACCESSING"`

Controls the identity under which the web app executes.

For example:

```typescript
export default defineConfig({
  appsScript: {
    scriptId: "your-script-id",
    manifest: {
      timeZone: "Asia/Tokyo",
      runtimeVersion: "V8",
    },
  },
});
```
