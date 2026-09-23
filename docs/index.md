---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: Vegas
  text: Vite-powered development and build tool for Google Apps Script
  tagline: "It feels like Vite, and it really is Vite (quick!)."
  image:
    src: /logo.webp
    alt: Vegas
  actions:
    - theme: brand
      text: Get Started
      link: /guide
    - theme: alt
      text: View on GitHub
      link: https://github.com/vegas-js/vegas

features:
  - title: Fast local development
    details: Use Vite-powered development workflows for Apps Script projects without making remote execution the center of every edit cycle.
  - title: Apps Script-aware builds
    details: Build client and server code around Apps Script constraints, including multiple independent frontend entries.
  - title: Explicit Local Runtime
    details: Exercise supported Apps Script APIs locally with documented behavior categories, limitations, and contract-based verification.
---

::: warning NOTICE

Vegas is an independent project not affiliated with **Google LLC** and **VoidZero Inc.**

:::

::: code-group

```sh [npm]
$ npm create vegas@latest
```

```sh [pnpm]
$ pnpm create vegas
```

:::
