---
outline: deep
---

# Vitest

Vegas는 개발 서버나 브라우저를 시작하지 않고도 서버 측 코드를 Local Runtime에 대해 테스트할 수 있도록 Vitest 어댑터를 제공합니다.

어댑터는 `@vegasjs/vegas/vitest`에서 export됩니다. Vegas 프로젝트를 로드하고 development mode로 서버 프로그램을 빌드한 뒤, 각 테스트에 새로운 Local Runtime harness를 제공합니다.

## Vitest 설치

Vitest는 `@vegasjs/vegas`의 optional peer dependency입니다. 테스트 어댑터를 사용하는 프로젝트에서는 Vitest를 설치하세요.

```sh
pnpm add -D vitest
```

현재 어댑터는 Vitest 5를 지원합니다.

## 기본 테스트

`createLocalRuntimeTest()`로 테스트 API를 만들고 `vegas` fixture를 사용하여 이름으로 서버 함수를 실행합니다.

```typescript
import { createLocalRuntimeTest } from "@vegasjs/vegas/vitest";
import { expect } from "vitest";

const test = createLocalRuntimeTest();

test("greets a user", async ({ vegas }) => {
  await expect(vegas.appsScript.execute("greet", ["Ada"])).resolves.toBe("Hello, Ada");
});
```

`vegas.appsScript.execute()`는 함수 이름과 선택적인 인수 배열을 받습니다. 반환값은 Local Runtime 실행에서 생성된 값입니다.

서버 프로그램은 선택한 Vegas 프로젝트에서 빌드됩니다. 테스트 어댑터는 Vegas 개발 서버, browser bridge, file watcher, Google backend를 시작하지 않습니다.

## Vegas 프로젝트 선택

기본적으로 `createLocalRuntimeTest()`는 현재 작업 디렉터리에서 Vegas 프로젝트를 로드합니다.

다른 Vegas 프로젝트 루트를 사용하려면 `root`를 지정합니다.

```typescript
const test = createLocalRuntimeTest({
  root: "./examples/app",
});
```

Vegas는 프로젝트 설정을 로드하고 서버 프로그램을 development mode로 빌드합니다. 이 project/program 환경은 개별 테스트마다 다시 빌드되지 않고 테스트 API에서 재사용됩니다.

## Runtime Data Seed

테스트에 필요한 Local Runtime 상태는 `runtimeData` 옵션으로 지정합니다.

```typescript
import { createLocalRuntimeTest, type RuntimeDataFixture } from "@vegasjs/vegas/vitest";

const runtimeData = {
  properties: {
    scriptProperties: {
      environment: "test",
    },
  },
  session: {
    activeUserEmail: "tester@example.com",
    activeUserLocale: "en",
  },
  spreadsheets: [
    {
      id: "budget",
      name: "Budget",
      sheets: [
        {
          id: 0,
          name: "Sheet1",
          maxRows: 20,
          maxColumns: 10,
          values: [
            ["Item", "Amount"],
            ["Hosting", 25],
          ],
        },
      ],
    },
  ],
} satisfies RuntimeDataFixture;

const test = createLocalRuntimeTest({ runtimeData });
```

inline fixture는 Local Runtime snapshot model과 동일하게 검증된 Properties, Session, Spreadsheet data shape를 지원합니다.

Vitest 어댑터는 프로젝트의 `runtime/` 디렉터리에서 module을 **자동으로 로드하지 않습니다**. 테스트 상태는 `runtimeData`로 명시적으로 전달하세요. `runtimeData`를 생략하면 빈 Runtime Data fixture에서 테스트 harness를 만듭니다.

## 테스트 격리

각 테스트는 새로 seed된 Local Runtime harness를 받습니다.

한 테스트에서 Apps Script API 또는 공개된 store를 통해 발생한 변경은 다음 테스트의 시작 상태가 되지 않습니다.

```typescript
const test = createLocalRuntimeTest({
  runtimeData: {
    properties: {
      scriptProperties: {
        prefix: "Vegas",
      },
    },
  },
});

test("can mutate state", async ({ vegas }) => {
  await vegas.appsScript.execute("setPrefix", ["Changed"]);

  await expect(vegas.appsScript.execute("getPrefix")).resolves.toBe("Changed");
});

test("starts from the fixture again", async ({ vegas }) => {
  await expect(vegas.appsScript.execute("getPrefix")).resolves.toBe("Vegas");
});
```

이 격리는 각 테스트에 생성되는 Local Runtime harness에 적용됩니다. 로드된 Vegas 프로젝트와 빌드된 서버 프로그램은 테스트 API 안에서 공유되지만, 변경 가능한 Runtime 상태는 fixture에서 다시 생성됩니다.

## Harness Surface

`vegas` fixture는 다음 surface를 가진 `LocalRuntimeHarness`입니다.

| Property           | 용도                                                             |
| ------------------ | ---------------------------------------------------------------- |
| `appsScript`       | Local Runtime을 통해 서버 함수를 실행합니다.                     |
| `runtime`          | 내부 `LocalRuntime`에 접근합니다.                                |
| `session`          | 이 테스트 harness가 소유하는 `LocalRuntimeSession`에 접근합니다. |
| `propertiesStore`  | 인메모리 Properties store를 직접 검사하거나 변경합니다.          |
| `spreadsheetStore` | 인메모리 Spreadsheet store를 직접 검사하거나 변경합니다.         |

애플리케이션 테스트에서는 일반적으로 `appsScript.execute()`를 통해 동작을 확인하세요. 더 낮은 수준의 Runtime과 store는 직접적인 상태 assertion이나 Runtime 전용 setup이 필요한 경우 사용할 수 있습니다.

## Local Runtime과의 관계

Vitest 어댑터는 Vegas development 워크플로와 동일한 Local Runtime 구현을 사용하지만, 테스트가 소유하는 lifecycle에서 동작합니다.

- Vegas 프로젝트와 서버 프로그램을 테스트 API용으로 로드합니다.
- inline Runtime Data를 snapshot으로 정규화합니다.
- 각 테스트에 새로운 seed된 Runtime session과 store를 만듭니다.
- 브라우저나 개발 서버를 시작하지 않고 서버 함수를 실행합니다.

Runtime Data의 의미, lifecycle, behavior category, API coverage 정책은 [Local Runtime](./local-runtime)을 참고하세요.
