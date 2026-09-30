---
outline: deep
---

# Getting Started

## Overview

Vegas (Vite + GAS) is an integrated development and build tool for modern projects on the Google Apps Script platform. It covers local development, production builds, authentication, and pushing build output to Apps Script.

- A development server with a local Apps Script-oriented runtime for supported APIs, powered by [Vite](https://vite.dev).

- A production build pipeline that bundles frontend and server code for Apps Script.

- Native Apps Script authentication and push commands for sending built output directly to an Apps Script project.

Vegas provides defaults for common project layouts, so many projects can start without custom configuration. See [Configuring Vegas](../config/) for available options.

Vite plugins can be supplied through Vegas configuration, allowing framework integrations and other Vite plugins to participate in the client build.

The reasoning behind the project is explained in detail in the [Why Vegas](./why) section.

## Choose Your Next Step

| Goal                                                       | Read                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Start a new project                                        | Continue with [Scaffolding Your First Vegas Project](#scaffolding-your-first-vegas-project) below |
| Learn the Vegas commands and their roles                   | [Command Line Interface](./cli)                                                                   |
| Understand source layout and SPA entry points              | [Project Structure](./project-structure)                                                          |
| Compare development, preview, and production builds        | [Development and Build](./development-and-build)                                                  |
| Understand local and Google server-function backends       | [Runtime Architecture](./runtime-architecture)                                                    |
| Understand local server-side execution                     | [Local Runtime](./local-runtime)                                                                  |
| Execute server functions through Google Apps Script        | [Google Apps Script Runtime](./google-apps-script-runtime)                                        |
| Model typed data stored in Google Sheets                   | [Spreadsheet Data](./spreadsheet-data)                                                            |
| Check which Apps Script APIs are modeled                   | [Runtime API coverage](./runtime-api-coverage)                                                    |
| Configure project layout, Apps Script metadata, or plugins | [Configuring Vegas](../config/)                                                                   |
| Understand the design rationale                            | [Why Vegas](./why) and [Project Philosophy](./philosophy)                                         |

## Scaffolding Your First Vegas Project

::: code-group

```sh [npm]
$ npm create vegas@latest
```

```sh [pnpm]
$ pnpm create vegas
```

:::

Then follow the prompts.

## SPA Entry Points

Vegas does not require Vite's conventional project-root `index.html`. SPA entries live under the configured client directory, which defaults to `src/client`.

Vegas supports two entry styles:

- Module entries named `main.ts`, `main.tsx`, `main.js`, or `main.jsx`. Vegas generates the corresponding HTML artifact.
- Physical `.html` entries inside the client directory. Vegas keeps their relative HTML paths as build entries.

This allows both generated-host and HTML-first projects while keeping client entry points separate from Apps Script server sources. Nested entries can also represent multiple frontends in one Apps Script project.

See [Project Structure](./project-structure) for the default layouts and entry-point rules.

## Command Line Interface

In a project where Vegas is installed, you can use the vegas binary in your npm scripts, or run it directly with npx vegas. Here are the default npm scripts in a scaffolded Vegas project:

::: code-group

```json [package.json]
{
  "scripts": {
    "dev": "vegas",
    "build": "vegas build",
    "preview": "vegas preview",
    "login": "vegas auth login",
    "push": "vegas push"
  }
}
```

:::

See [Command Line Interface](./cli) for the available commands, aliases, root argument, and authentication options.

## Pushing to Apps Script

Set the Apps Script project ID in `vegas.config.ts`:

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appsScript: {
    scriptId: "your-script-id",
    manifest: {},
  },
});
```

Authenticate once with a Google Desktop OAuth client JSON file:

```bash
npm run login -- ./client-secret.json
```

Then build and push the project:

```bash
npm run build
npm run push
```

`vegas push` uploads the authoritative contents of the production build output to the configured Apps Script project.
