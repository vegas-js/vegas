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
- **Default:** `src/server`

The directory that serves as the starting point for exploring server (GAS) programs.

## gasMockDir

- **Type:** `string`
- **Default:** `mock`

The directory that serves as the starting point for exploring mocks.

## plugins

- **Type:** `PluginOption[]`

An array of plugins to use. This will be passed directly to Vite. For details about the plugins, please refer to the [Vite Plugin API](https://vite.dev/guide/api-plugin).

## appType

- **Type:** `"spa" | "script"`
- **Default:** `"spa"`

Defines the application type.

Use `"spa"` for applications with client entry points and `"script"` for Apps Script projects that do not require a client application.

## output

- **Type:** `object`

Build output configuration.

### output.dir

- **Type:** `string`
- **Default:** `dist`

Directory where production build artifacts are written. Relative paths are resolved from the project root.

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

#### appsScript.manifest.timeZone

- **Type:** `string`
- **Default:** `"UTC"`

Time zone written to the Apps Script manifest.

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
