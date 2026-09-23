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
| Understand local server-side execution                     | [Local Runtime](./local-runtime)                                                                  |
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

## `index.html` and Project Root

You may have noticed that `index.html` is not located in the root of a Vegas SPA project. This is intentional. Unlike Vite's default HTML-entry model, Vegas uses client modules such as `main.ts` or `main.tsx` as SPA entry points and generates the host HTML during the build.

There are two Apps Script-specific reasons for this design.

First, Apps Script web apps are served through HTML Service and its iframe sandbox. Vegas therefore owns the generated host document needed to load the built client instead of requiring a hand-maintained root `index.html`.

Second, a single Apps Script project can contain multiple frontends. Vegas detects separate client entries, such as admin and user frontends, and emits an independent HTML artifact for each entry.

## Command Line Interface

In a project where Vegas is installed, you can use the vegas binary in your npm scripts, or run it directly with npx vegas. Here are the default npm scripts in a scaffolded Vegas project:

::: code-group

```json [package.json]
{
  "scripts": {
    "dev": "vegas",
    "build": "vegas build",
    "login": "vegas auth login",
    "push": "vegas push"
  }
}
```

:::

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
