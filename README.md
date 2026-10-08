# Vegas

[![npm version](https://img.shields.io/npm/v/@vegasjs/vegas)](https://www.npmjs.com/package/@vegasjs/vegas)
[![CI](https://github.com/vegas-js/vegas/actions/workflows/ci.yml/badge.svg)](https://github.com/vegas-js/vegas/actions)
[![license](https://img.shields.io/npm/l/@vegasjs/vegas)](./LICENSE)

> **It feels like Vite, and it really is Vite (quick!).**

Vegas is a Vite-powered development and build tool for Google Apps Script projects, supporting both SPA and script-only applications.

## ⚠ Breaking changes ⚠

This project is in the experimental stage and will undergo frequent breaking changes.

## Features

- Vite-powered development and production builds
- SPA and script-only Apps Script project support
- Automatic client entry point detection for SPA projects
- Client library for calling Apps Script server functions
- Authentication and push workflows using the Google Apps Script API

## Quick Start

Vegas requires Node.js 22.18.0 or newer.

Create a project and select a template and package manager when prompted:

```sh
npm create vegas@latest
```

The project generator can install dependencies and start the development server. If you skip those steps, enter the generated project directory (replace `vegas-project` with its actual name) and run:

```sh
cd vegas-project
npm install
npm run dev
```

Use the generated project scripts to build and preview:

```sh
npm run build
npm run preview
```

For Apps Script authentication, push, and configuration, see the [Getting Started guide](https://vegasjs.dev/guide/).

## Project Structure

### Basic SPA

```plaintext
src/
  ├─ client/
  │ └─ main.tsx  // client entry ( to: dist/index.html )
  └─ server/
    └─ Code.ts
```

### Multi Front SPA

```plaintext
src/
  ├─ client/
  │ ├─ sub1/
  │ │  └─ main.tsx // client entry ( to: dist/sub1.html )
  │ └─ main.tsx  // client entry ( to: dist/index.html )
  └─ server/
    └─ Code.ts
```

### GAS Only (No SPA)

```plaintext
src/
  └─ Code.ts
```

Please add the appType setting to `vegas.config.ts`.

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appType: "script",
});
```

## Local Runtime

Vegas includes a local runtime for development and preview workflows.

The current runtime provides partial implementations of selected Apps Script APIs, including `HtmlService`, `PropertiesService`, `CacheService`, `SpreadsheetApp`, `UrlFetchApp`, `Utilities`, and `Session`.

API coverage varies by service and method. The local runtime should not be treated as a complete or exact reproduction of the Google Apps Script execution environment.

[Read the Docs to Learn More](https://vegasjs.dev).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for repository setup, testing, architecture, and Local Runtime contribution guidelines.

## License

[MIT License](./LICENSE).

## Afterword

### Note

Vegas is an independent project not affiliated with Google LLC and VoidZero Inc.

### Thanks

Thanks to everyone who provides Vite, and other tools.
