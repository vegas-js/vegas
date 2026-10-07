---
outline: deep
---

# Playwright

Vegas는 로컬 Web 애플리케이션과 Local Runtime을 브라우저 수준에서 테스트하기 위한 Playwright 어댑터를 제공합니다.

어댑터는 `@vegasjs/vegas/playwright`에서 export됩니다. 각 테스트마다 격리된 browser harness를 만들고, 임시 origin에서 로컬 Web 애플리케이션을 시작하며, 렌더링된 user application을 하나의 `Locator`로 공개합니다.

## Playwright 설치

Playwright는 `@vegasjs/vegas`의 optional peer dependency입니다. browser test adapter를 사용하는 프로젝트에서는 설치하세요.

```sh
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Playwright 설정에서 사용하는 browser를 설치하세요. Vegas는 테스트 실행에 사용할 browser를 선택하지 않으며, 일반적인 Playwright 설정이 이를 제어합니다.

## 기본 테스트

`createBrowserTest()`로 테스트 API를 만들고 `vegas.app`을 통해 애플리케이션을 조작합니다.

```typescript
import { createBrowserTest, expect } from "@vegasjs/vegas/playwright";

const test = createBrowserTest();

test("updates the greeting", async ({ vegas }) => {
  await vegas.app.getByRole("button", { name: "Update greeting" }).click();

  await expect(vegas.app.locator("#result")).toHaveText("Hello from Vegas");
});
```

`vegas.app`은 user HTML document의 `body`를 root로 하는 Playwright `Locator`입니다. 이 root에서 일반적인 locator chaining과 Playwright assertion을 사용할 수 있습니다.

Vegas는 browser fixture에서 내부 iframe 구조를 의도적으로 숨깁니다. 일반적인 애플리케이션 테스트는 host, sandbox, user HTML frame이 어떻게 중첩되어 있는지 알 필요가 없습니다.

## Browser Harness가 테스트하는 것

`createBrowserTest()`로 만든 각 Playwright test는 Vegas 로컬 browser harness를 사용합니다. harness는 다음 작업을 수행합니다.

1. 선택한 Vegas 프로젝트를 로드합니다.
2. development mode로 서버 프로그램을 빌드합니다.
3. inline Runtime Data fixture에서 새로운 Local Runtime을 만듭니다.
4. 임시 port에서 로컬 host server와 user-content server를 시작합니다.
5. Playwright `page`에서 host application을 엽니다.
6. user HTML frame이 주입될 때까지 기다린 뒤 `vegas.app`을 공개합니다.

`google.script.run`을 통한 클라이언트 호출은 로컬 browser bridge를 통과하여 해당 테스트의 Local Runtime에서 실행됩니다.

프로젝트가 일반 development에서 Google-backed server function을 사용하도록 설정되어 있어도 Playwright 어댑터는 서버 함수 호출을 Google Apps Script backend로 라우팅하지 않습니다. browser test는 Local Runtime test입니다.

## Host Page와 Application Locator

테스트 API에서는 Playwright의 기본 fixture도 그대로 사용할 수 있습니다. 특히 `page`는 바깥쪽 Vegas host page를 가리키고, `vegas.app`은 중첩된 user-content frame 안에 렌더링된 user application을 가리킵니다.

```typescript
const test = createBrowserTest();

test("can inspect the host and the application", async ({ page, vegas }) => {
  expect(new URL(page.url()).pathname).toBe("/dev");
  await expect(vegas.app.locator("main")).toBeVisible();
});
```

일반적인 애플리케이션 조작에는 `vegas.app`을 사용하세요. host-level navigation, request API, user HTML document 밖의 Playwright 기능이 의도적으로 필요한 경우 `page`를 사용합니다.

## Vegas 프로젝트 선택

기본적으로 `createBrowserTest()`는 현재 작업 디렉터리에서 Vegas 프로젝트를 로드합니다.

다른 Vegas 프로젝트 루트를 사용하려면 `root`를 지정합니다.

```typescript
const test = createBrowserTest({
  root: "./examples/app",
});
```

선택한 프로젝트가 browser harness에서 사용할 로컬 Web 애플리케이션과 서버 프로그램을 제공합니다.

## Runtime Data Seed

테스트용 Local Runtime 상태는 `runtimeData` 옵션으로 지정합니다.

```typescript
import { createBrowserTest, type RuntimeDataFixture } from "@vegasjs/vegas/playwright";

const runtimeData = {
  properties: {
    scriptProperties: {
      environment: "browser-test",
    },
  },
  session: {
    activeUserEmail: "tester@example.com",
  },
} satisfies RuntimeDataFixture;

const test = createBrowserTest({ runtimeData });
```

inline fixture는 Vitest 어댑터 및 Local Runtime snapshot model과 동일하게 검증된 Properties, Session, Spreadsheet data shape를 사용합니다.

Playwright 어댑터는 프로젝트의 `runtime/` 디렉터리에서 module을 **자동으로 로드하지 않습니다**. browser test 상태는 `runtimeData`로 명시적으로 전달하세요.

## 테스트 격리

각 테스트에는 새로운 browser harness, Local Runtime, Runtime session, 인메모리 store, 임시 local server가 생성됩니다. 테스트가 끝나면 harness는 dispose됩니다.

따라서 Runtime 변경은 다음 browser test의 시작 상태가 되지 않습니다.

```typescript
const test = createBrowserTest({
  runtimeData: {
    properties: {
      scriptProperties: {
        prefix: "Vegas",
      },
    },
  },
});

test("can mutate runtime state", async ({ vegas }) => {
  await vegas.app.getByRole("button", { name: "Change prefix" }).click();
  await expect(vegas.app.locator("#result")).toHaveText("Changed");
});

test("starts from the fixture again", async ({ vegas }) => {
  await expect(vegas.app.locator("#result")).toHaveText("Vegas");
});
```

이 격리는 test scope입니다. Local Runtime 변경을 Runtime Data 파일에 다시 저장하지 않습니다.

## Cross-Origin Web App Model

browser harness는 Vegas host와 user-content application을 서로 다른 임시 origin에서 실행합니다. user HTML은 로컬 Web app development와 동일한 cross-origin iframe 및 message bridge model 안에 유지됩니다.

따라서 Playwright 어댑터는 서버만으로는 테스트할 수 없는 다음 동작에 적합합니다.

- browser 렌더링과 상호작용
- 클라이언트에서 서버로의 `google.script.run` 호출
- Vegas browser bridge
- iframe 및 cross-origin 통합 동작
- Playwright의 `page` 및 request API와 결합한 host-level HTTP 동작

구체적인 임시 port 번호는 의도적으로 테스트 계약의 일부로 두지 않습니다.

## Playwright Assertion

`@vegasjs/vegas/playwright`는 Playwright의 `expect`를 re-export하므로 테스트 어댑터와 browser assertion을 같은 entry point에서 import할 수 있습니다.

```typescript
import { createBrowserTest, expect } from "@vegasjs/vegas/playwright";
```

그 밖의 Playwright API는 일반적으로 `@playwright/test`에서 import할 수 있습니다.

## Vitest와 Playwright 중 무엇을 사용할까?

Local Runtime에서 서버 함수를 직접 실행하는 것만으로 확인할 수 있는 동작에는 [Vitest](./vitest)를 사용하세요. 브라우저와 로컬 Web server를 시작하지 않고 테스트할 수 있습니다.

browser application, `google.script.run`, Web app bridge, cross-origin framing, host-level HTTP 동작에 의존하는 경우 Playwright를 사용하세요.

두 어댑터 모두 명시적인 inline Runtime Data를 사용하고 테스트마다 격리된 Local Runtime 상태를 만듭니다. Runtime Data의 의미와 Runtime 동작 정책은 [Local Runtime](./local-runtime)을 참고하세요.
