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
