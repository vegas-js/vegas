---
outline: deep
---

# 시작하기

## 개요

Vegas(Vite + GAS)는 Google Apps Script 플랫폼에 전용 현대식 프로젝트 워크플로를 제공하는 개발 및 빌드 도구입니다.

- [Vite](https://vite.dev)를 기반으로 하며, 지원되는 Apps Script API를 위한 로컬 Apps Script 지향 Runtime을 포함한 개발 서버.

- 프런트엔드 및 서버 코드에서 Apps Script에 특화된 번들을 생성하는 프로덕션 빌드 파이프라인.

- 빌드 아티팩트를 Apps Script 프로젝트로 직접 전송하기 위한 기본 Apps Script 인증 및 push 명령.

Vegas는 일반적인 프로젝트 레이아웃에 대한 기본값을 제공하므로 많은 프로젝트를 사용자 지정 설정 없이 시작할 수 있습니다. 사용할 수 있는 옵션은 [Vegas 설정](../config/)을 참고하세요.

Vegas 설정을 통해 Vite 플러그인을 전달할 수 있으므로 프레임워크 통합과 기타 Vite 플러그인이 클라이언트 빌드에 참여할 수 있습니다.

프로젝트의 설계 배경은 [Why Vegas](./why)에서 자세히 설명합니다.

## 첫 Vegas 프로젝트 생성하기

::: code-group

```sh [npm]
$ npm create vegas@latest
```

```sh [pnpm]
$ pnpm create vegas
```

:::

표시되는 안내에 따라 진행하세요.

## SPA 엔트리 포인트

Vegas는 Vite에서 일반적으로 사용하는 프로젝트 루트의 `index.html`을 필수로 요구하지 않습니다. SPA 엔트리는 설정된 클라이언트 디렉터리 아래에 위치하며 기본값은 `src/client`입니다.

Vegas는 두 가지 엔트리 형식을 지원합니다.

- `main.ts`, `main.tsx`, `main.js`, `main.jsx`라는 이름의 모듈 엔트리. Vegas가 해당 HTML 아티팩트를 생성합니다.
- 클라이언트 디렉터리 안의 실제 `.html` 엔트리. Vegas는 클라이언트 디렉터리 기준의 상대 HTML 경로를 빌드 엔트리로 유지합니다.

이를 통해 생성된 host HTML을 사용하는 프로젝트와 HTML 우선 프로젝트를 모두 지원하면서, 클라이언트 엔트리 포인트를 Apps Script 서버 소스와 분리할 수 있습니다. 중첩된 엔트리를 사용하면 하나의 Apps Script 프로젝트에 여러 프런트엔드를 구성할 수도 있습니다.

기본 레이아웃과 엔트리 포인트 규칙은 [프로젝트 구조](./project-structure)를 참고하세요.

## 명령줄 인터페이스

Vegas가 설치된 프로젝트에서는 npm scripts에서 `vegas` 바이너리를 사용하거나 `npx vegas`로 직접 실행할 수 있습니다. `create-vegas`로 생성한 프로젝트에는 기본적으로 다음 npm scripts가 포함됩니다.

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

사용할 수 있는 명령, 별칭, root 인수, 인증 옵션은 [명령줄 인터페이스](./cli)를 참고하세요.

## Apps Script로 push하기

`vegas.config.ts`에 Apps Script 프로젝트 ID를 설정합니다.

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appsScript: {
    scriptId: "your-script-id",
    manifest: {},
  },
});
```

Google Desktop OAuth 클라이언트 JSON 파일을 사용하여 한 번 인증합니다.

```bash
npm run login -- ./client-secret.json
```

그다음 프로젝트를 빌드하고 push합니다.

```bash
npm run build
npm run push
```

`vegas push`는 현재 프로덕션 빌드 출력의 내용을 기준으로 설정된 Apps Script 프로젝트에 업로드합니다.
