---
outline: deep
---

# Project Structure

Vegas resolves source, runtime-data, and output directories from the project root. The defaults depend on the project type and can be changed through [configuration](../config/).

## Project Types

Vegas supports two project types through `appType`:

| `appType`  | Purpose                                        | Default client directory | Default server directory |
| ---------- | ---------------------------------------------- | ------------------------ | ------------------------ |
| `"spa"`    | Apps Script project with a client application  | `src/client`             | `src/server`             |
| `"script"` | Apps Script project without SPA client entries | —                        | `src`                    |

`"spa"` is the default.

## SPA Projects

A typical SPA project separates client and Apps Script server sources:

```text
src/
├─ client/
│  └─ main.ts
└─ server/
   └─ Code.ts
```

Vegas recognizes two kinds of SPA client entry.

### Module Entries

A JavaScript or TypeScript source file named `main` is treated as a module entry. Supported extensions are `.ts`, `.tsx`, `.js`, and `.jsx`.

For example:

```text
src/client/main.ts        -> dist/index.html
src/client/admin/main.ts  -> dist/admin.html
```

The entry ID comes from the directory containing `main`. Two `main` files in the same directory would produce the same entry ID and are rejected.

### HTML Entries

HTML files under the client directory are also treated as entries. Their paths relative to the client directory are preserved:

```text
src/client/index.html            -> dist/index.html
src/client/admin/index.html      -> dist/admin/index.html
```

This is the entry style used by some `create-vegas` templates. An HTML entry can import client modules in the same way as a normal Vite HTML entry.

## Script Projects

For projects without a client application, set `appType` to `"script"`:

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appType: "script",
});
```

The default server directory becomes `src`, so a minimal project can be:

```text
src/
└─ Code.ts
```

Script projects do not create SPA client entries.

## Runtime Data

The default local runtime data directory is `runtime` at the project root:

```text
runtime/
└─ spreadsheet.ts
```

Vegas scans TypeScript files in this directory as local runtime data sources. Runtime data is separate from application source code. See [Local Runtime](./local-runtime) for its lifecycle and behavior.

## Production Output

Production artifacts are written to `dist` by default:

```text
dist/
```

The output directory is generated content rather than source. A successful production build replaces the existing output directory with the newly built artifacts.

## Custom Directories

The default layout can be changed with these configuration options:

- `root`
- `clientDir`
- `serverDir`
- `runtimeDataDir`
- `output.dir`

See [Shared Options](../config/shared-options) for resolution rules and defaults.
