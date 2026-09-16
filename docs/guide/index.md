---
outline: deep
---

# Getting Started

## Overview

Vegas (Vite + GAS) is an integrated development and build tool for modern projects on the Google Apps Script platform. It covers local development, production builds, authentication, and pushing build output to Apps Script.

- A development server with a local GAS-compatible runtime, powered by [Vite](https://vite.dev).

- A production build pipeline that bundles frontend and server code for Apps Script.

- Native Apps Script authentication and push commands for sending built output directly to an Apps Script project.

Vegas provides a zero-config experience, achieving optimal build results without any configuration in most cases. See the Feature Guide for details.

It features a Vite plugin pass-through function, enabling framework support and integration with other tools with the Vite experience.

The reasoning behind the project is explained in detail in the [Why Vegas](./why) section.

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

You may have noticed that index.html is not located in the root of the Vegas project. This is intentional. Vegas automatically detects entry points like `main.ts` or `main.tsx`.

There are two main reasons why we didn't follow Vite's configuration.

First, when building an SPA on the GAS platform, there's almost no point in editing raw HTML.
Web apps (not just SPAs) running on the GAS platform run in an iframe sandbox, so header settings and the like are meaningless. Also, using an SPA framework is much more efficient than manually writing HTML files with SPA in mind.

The second reason is the realization of a single project/multiple frontends.

Existing SPA tool configurations typically have one frontend per GAS project. However, this doesn't address the need to manage separate frontends (e.g., admin and user dashboards) within a single codebase. Vegas is designed to easily address this need.

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
