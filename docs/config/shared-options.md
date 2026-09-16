# Shared Options

Unless noted, the options in this section are applied to all dev and build.

## root

- **Type:** `string`
- **Default:** `process.cwd()`

Project root directory. Can be an absolute path, or a path relative to the current working directory.

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

- **Type:** `(Plugin | Plugin[] | Promise<Plugin | Plugin[]>)[]`

An array of plugins to use. This will be passed directly to Vite. For details about the plugins, please refer to the [Vite Plugin API](https://vite.dev/guide/api-plugin).

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

The legacy top-level `gas` option is deprecated. `appsScript.manifest` takes precedence over legacy `gas` values on a field-by-field basis.
