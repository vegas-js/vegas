---
outline: deep
---

# 프로젝트 구조

Vegas는 프로젝트 루트에서 source, Runtime Data, output 디렉터리를 해석합니다. 기본값은 프로젝트 유형에 따라 달라지며 [설정](../config/)에서 변경할 수 있습니다.

## 프로젝트 유형

Vegas는 `appType`을 통해 두 가지 프로젝트 유형을 지원합니다.

| `appType` | 용도 | 기본 클라이언트 디렉터리 | 기본 서버 디렉터리 |
| --- | --- | --- | --- |
| `"spa"` | 클라이언트 애플리케이션이 있는 Apps Script 프로젝트 | `src/client` | `src/server` |
| `"script"` | SPA 클라이언트 엔트리가 없는 Apps Script 프로젝트 | — | `src` |

기본값은 `"spa"`입니다.

## SPA 프로젝트

일반적인 SPA 프로젝트는 클라이언트 소스와 Apps Script 서버 소스를 분리합니다.

```text
src/
├─ client/
│  └─ main.ts
└─ server/
   └─ Code.ts
```

Vegas는 두 종류의 SPA 클라이언트 엔트리를 인식합니다.

### 모듈 엔트리

`main`이라는 이름의 JavaScript 또는 TypeScript 소스 파일은 모듈 엔트리로 처리됩니다. 지원되는 확장자는 `.ts`, `.tsx`, `.js`, `.jsx`입니다.

예:

```text
src/client/main.ts        -> dist/index.html
src/client/admin/main.ts  -> dist/admin.html
```

엔트리 ID는 `main`을 포함하는 디렉터리에서 결정됩니다. 같은 디렉터리에 두 개의 `main` 파일이 있으면 동일한 엔트리 ID가 생성되므로 거부됩니다.

### HTML 엔트리

클라이언트 디렉터리 아래의 HTML 파일도 엔트리로 처리됩니다. 클라이언트 디렉터리 기준 상대 경로는 그대로 유지됩니다.

```text
src/client/index.html            -> dist/index.html
src/client/admin/index.html      -> dist/admin/index.html
```

일부 `create-vegas` 템플릿이 이 엔트리 형식을 사용합니다. HTML 엔트리에서는 일반적인 Vite HTML 엔트리와 동일한 방식으로 클라이언트 모듈을 import할 수 있습니다.

## Script 프로젝트

클라이언트 애플리케이션이 없는 프로젝트에서는 `appType`을 `"script"`로 설정합니다.

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appType: "script",
});
```

기본 서버 디렉터리가 `src`가 되므로 최소 구성은 다음과 같습니다.

```text
src/
└─ Code.ts
```

Script 프로젝트는 SPA 클라이언트 엔트리를 생성하지 않습니다.

## Runtime Data

로컬 Runtime Data의 기본 디렉터리는 프로젝트 루트의 `runtime`입니다.

```text
runtime/
└─ spreadsheet.ts
```

Vegas는 이 디렉터리의 TypeScript 파일을 로컬 Runtime Data source로 스캔합니다. Runtime Data는 애플리케이션 소스 코드와 별개입니다. lifecycle과 동작은 [Local Runtime](./local-runtime)을 참고하세요.

## 프로덕션 출력

프로덕션 아티팩트는 기본적으로 `dist`에 기록됩니다.

```text
dist/
```

출력 디렉터리는 source가 아니라 생성된 콘텐츠입니다. 프로덕션 빌드가 성공하면 기존 출력 디렉터리를 새로 빌드된 아티팩트로 교체합니다.

## 사용자 지정 디렉터리

기본 레이아웃은 다음 설정 옵션으로 변경할 수 있습니다.

- `root`
- `clientDir`
- `serverDir`
- `runtimeDataDir`
- `output.dir`

해석 규칙과 기본값은 [공통 옵션](../config/shared-options)을 참고하세요.
