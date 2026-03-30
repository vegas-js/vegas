# Vegas

[![npm version](https://img.shields.io/npm/v/@vegasjs/vegas)](https://www.npmjs.com/package/@vegasjs/vegas)
[![CI](https://github.com/vegas-js/vegas/actions/workflows/ci.yml/badge.svg)](https://github.com/vegas-js/vegas/actions)
[![license](https://img.shields.io/npm/l/@vegasjs/vegas)](./LICENSE)

> **It feels like Vite, and it really is Vite (quick!).**

Vegas is a tool for building SPAs on the GAS platform, powered by `Vite`, which significantly improves the frontend development experience.

## ⚠ Breaking changes ⚠

This project is in the experimental stage and will undergo frequent breaking changes.

## Features

- Automatically detects client entry points
- Build flow optimized for the GAS platform
- Includes a client library to call GAS functions
- Compatible with Vite plugins

## Quick Start

Development

```sh
npx vegas         # start development server
npx vegas dev     # alternative development command
npx vegas serve   # further alternative
```

Production

```sh
npx vegas preview # locally preview production build
npx vegas build   # build for production
```

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

## Supported GAS APIs (Local Runtime)

- ✅: support
- 🧪: require tests
- 🛠️: under development
- ❌: no implementation (undefined)

| API               | Status |
| ----------------- | :----: |
| HtmlService       |   🛠️   |
| PropertiesService |   🧪   |
| CacheService      |   🧪   |
| LockService       |   🛠️   |
| SpreadsheetApp    |   🛠️   |
| UrlFetchApp       |   🛠️   |
| Utilities         |   🛠️   |
| Session           |   🧪   |
| Logger / console  |   🛠️   |
| Others            |   ❌   |

[Read the Docs to Learn More](https://vegasjs.dev).

## License

[MIT License](./LICENSE).

## Afterword

### Note

Vegas is an independent project not affiliated with Google LLC and VoidZero Inc.

### Thanks

Thanks to everyone who provides Vite, and other tools.
