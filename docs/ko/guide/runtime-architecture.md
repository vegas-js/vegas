---
outline: deep
---

# Runtime 아키텍처

Vegas는 서버 함수를 실행하는 데 사용하는 인터페이스와 실제 실행을 수행하는 backend를 분리합니다. 이를 통해 클라이언트에서 서버 함수를 호출하는 모델을 바꾸지 않고도 로컬 Web 애플리케이션이 Vegas Local Runtime 또는 Google Apps Script 프로젝트를 사용할 수 있습니다.

## Runtime Backend 경계

내부적으로 두 실행 경로는 동일한 runtime backend 계약을 구현합니다. 요청은 서버 함수를 식별하고 인수를 전달하며, 필요에 따라 invocation context와 abort signal을 포함할 수 있습니다. backend는 해당 요청을 처리하고 결과를 비동기로 반환합니다.

공유 경계는 의도적으로 작게 유지됩니다. 서버 함수 호출을 dispatch하는 코드는 함수가 로컬에서 실행되는지, Google Apps Script를 통해 실행되는지 알 필요가 없습니다.

## Local Backend

기본 backend는 `local`입니다.

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appsScript: {
    serverFunctions: {
      backend: "local",
    },
  },
});
```

서버 함수는 현재 로컬 서버 빌드를 사용하여 Vegas Local Runtime에서 실행됩니다. Runtime Data와 session이 소유하는 로컬 리소스는 Local Runtime lifecycle에서 제공됩니다.

빠른 로컬 개발을 위한 일반적인 경로이며, `appsScript.serverFunctions`를 생략했을 때도 이 backend가 사용됩니다.

동작 모델, audit 정책, API coverage는 [Local Runtime](./local-runtime)을 참고하세요.

## Google Apps Script Backend

로컬 Web 애플리케이션에서 호출한 서버 함수를 Google Apps Script에서 실행하려면 `appsScript.serverFunctions.backend`를 `"google"`로 설정합니다.

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appsScript: {
    scriptId: "your-script-id",
    serverFunctions: {
      backend: "google",
      profile: "work",
    },
    manifest: {
      oauthScopes: ["https://www.googleapis.com/auth/script.projects"],
    },
  },
});
```

이 backend에서 Vegas는 Apps Script 인증 기능을 통해 access token을 얻고, 설정된 Apps Script 프로젝트로 함수 호출을 전송합니다.

Google backend에는 다음 항목이 필요합니다.

- `appsScript.scriptId`
- `appsScript.manifest.oauthScopes`에 하나 이상의 비어 있지 않은 항목

선택 사항인 `profile`은 이름이 지정된 인증 프로필을 선택합니다. 선택 사항인 `devMode` 플래그는 Apps Script API 실행 요청에 그대로 전달됩니다.

Google 측 요구 사항, 인증, 실행 코드 선택, serialization, 오류 동작은 [Google Apps Script Runtime](./google-apps-script-runtime)을 참고하세요.

## Backend 선택으로 달라지는 것

`appsScript.serverFunctions`는 로컬 Web 애플리케이션에서 이루어지는 서버 함수 호출의 실행 대상을 선택합니다.

이 설정은 Vegas 개발 환경 전체를 로컬 실행에서 Google 인프라로 전환하는 설정이 **아닙니다**. development와 preview는 계속 Vegas 로컬 애플리케이션을 시작하고, 로컬 클라이언트 및 서버 아티팩트를 빌드하며, 로컬 애플리케이션 lifecycle에서 사용하는 Local Runtime을 유지합니다.

backend가 `google`이면 로컬 애플리케이션은 서버 함수 호출만 Local Runtime 대신 Google backend로 라우팅합니다. 그 밖의 로컬 개발 책임은 계속 로컬에 남습니다.

## Development 및 Preview

`vegas` / `vegas dev` / `vegas serve`와 `vegas preview`는 모두 설정된 서버 함수 backend를 따릅니다.

development와 preview의 차이는 [개발과 빌드](./development-and-build)에서 설명하는 빌드 모드입니다. backend 선택은 builder가 development mode와 production mode 중 어느 것을 사용하는지와 독립적입니다.

## Build 및 Push

Runtime backend 선택은 프로덕션 아티팩트 생성이나 업로드 동작을 변경하지 않습니다.

- `vegas build`는 프로덕션 아티팩트를 생성합니다.
- `vegas push`는 현재 프로덕션 출력을 업로드합니다.

일반적인 워크플로에서 두 명령 모두 설정된 development backend를 통해 애플리케이션 서버 함수를 실행하지 않습니다.

전체 설정 reference는 [공통 옵션](../config/shared-options#appsscriptserverfunctions)을 참고하세요.
