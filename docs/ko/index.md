---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: Vegas
  text: Google Apps Script를 위한 빌드 도구
  tagline: "Vegas는 Google Apps Script에 특화된 Vite 기반 개발 및 빌드 도구입니다."
  image:
    src: /logo.webp
    alt: Vegas
  actions:
    - theme: brand
      text: 시작하기
      link: /ko/guide
    - theme: alt
      text: GitHub에서 보기
      link: https://github.com/vegas-js/vegas

features:
  - title: 빠른 로컬 개발
    details: 편집할 때마다 원격 실행을 중심에 두지 않고, Apps Script 프로젝트에서 Vite 기반 개발 워크플로를 사용할 수 있습니다.
  - title: Apps Script에 특화된 빌드
    details: 여러 개의 독립적인 프런트엔드 엔트리를 포함해 Apps Script의 제약을 고려하여 클라이언트 및 서버 코드를 빌드합니다.
  - title: 명시적인 Local Runtime
    details: 지원되는 Apps Script API를 문서화된 동작 범주, 제한 사항, 계약 기반 검증과 함께 로컬에서 실행할 수 있습니다.
---

::: warning 안내

Vegas는 **Google LLC** 및 **VoidZero Inc.**와 제휴하지 않은 독립 프로젝트입니다.

:::

::: code-group

```sh [npm]
$ npm create vegas@latest
```

```sh [pnpm]
$ pnpm create vegas
```

:::
