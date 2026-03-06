---
outline: deep
---

# Getting Started

## Overview

Vegas (Vite + GAS) is an integrated build tool aimed at providing a faster, more streamlined development environment for modern web projects on the GAS platform. Vegas consists of two main parts:

- A development server with a local GAS compatible runtime, powered by [Vite](https://vite.dev), a powerful tool with hot module replacement (HMR).

- A build command that bundles frontend and server code, powered by [Vite](https://vite.dev), further enhanced with the introduction of Rust.

Vegas provides a zero-config experience, achieving optimal build results without any configuration in most cases. See the Feature Guide for details.

It features a Vite plugin pass-through function, enabling framework support and integration with other tools with the Vite experience.

The reasoning behind the project is explained in detail in the [Why Vegas](./why/) section.

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
    "dev": "vegas", // start dev server, aliases: `vegas dev`, `vegas serve`
    "build": "vegas build" // build for production
  }
}
```

:::
