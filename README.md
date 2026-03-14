# Vegas

[![npm version](https://img.shields.io/npm/v/@vegasjs/vegas)](https://www.npmjs.com/package/@vegasjs/vegas)
[![CI](https://github.com/vegas-js/vegas/actions/workflows/ci.yml/badge.svg)](https://github.com/vegas-js/vegas/actions)
[![license](https://img.shields.io/npm/l/@vegasjs/vegas)](./LICENSE)

> **It feels like Vite, and it really is Vite.**

Vegas is a tool for building SPAs on the GAS platform, powered by `Vite`, which significantly improves the frontend development experience.

## ⚠ Breaking changes ⚠

This project is in the experimental stage and will undergo frequent disruptive changes.

## Features

- Automatically detects web entry points
- Build flow optimized for the GAS platform
- Includes a client library to call GAS functions
- Compatible with Vite plugins

## Quick Start

Development

```sh
npx vegas        # start development server
npx vegas dev    # alternative development command
npx vegas serve  # further alternative
```

Production build

```sh
npx vegas build
```

## Project Structure

### Basic

```plaintext
src/
  ├─ server/
  │  └─ Code.ts
  └─ web/
    └─ main.tsx  // web entry ( to: dist/index.html )
```

### Multi Front / Single GAS

```plaintext
src/
  ├─ server/
  │  └─ Code.ts
  └─ web/
    ├─ sub1/
    │  └─ main.tsx // web entry ( to: dist/sub1.html )
    └─ main.tsx  // web entry ( to: dist/index.html )
```

[Read the Docs to Learn More](https://vegasjs.dev).

## Supported GAS APIs (Local Runtime)

| API               | Status         |
| ----------------- | -------------- |
| HtmlService       | 🛠️             |
| PropertiesService | ✅             |
| CacheService      | 🛠️             |
| LockService       | 🛠️             |
| SpreadsheetApp    | 🛠️             |
| UrlFetchApp       | 🛠️             |
| Utilities         | 🛠️             |
| Session           | ✅             |
| Logger / console  | 🛠️             |
| Others            | ❌ (undefined) |

## License

[MIT License](./LICENSE).

## Afterword

### Note

Vegas is an independent project not affiliated with Google LLC and VoidZero Inc.

### Thanks

Thanks to everyone who provides Vite, and other tools.
