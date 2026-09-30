---
outline: deep
---

# Google Apps Script Runtime

Vegas는 로컬 Web 애플리케이션의 서버 함수 호출을 Local Runtime에서 실행하는 대신 Google Apps Script로 라우팅할 수 있습니다. 이 backend는 Google Apps Script API의 `scripts.run` endpoint와 [Runtime 아키텍처](./runtime-architecture)에서 설명하는 동일한 서버 함수 호출 모델을 사용합니다.

이 backend는 Google Apps Script 프로젝트에 이미 존재하는 코드를 의도적으로 실행하기 위한 것입니다. 각 호출 전에 현재 메모리상의 로컬 서버 빌드를 업로드하지 않으며, Vegas 로컬 개발 환경의 다른 부분을 대체하지도 않습니다.

## Google 측 요구 사항

`script.run`으로 함수를 실행하기 전에 Google 측에서 몇 가지 설정이 필요합니다.

- Apps Script 프로젝트를 **API executable**로 deploy해야 합니다.
- Apps Script 프로젝트와 Vegas에서 사용하는 OAuth client는 동일한 **표준 Google Cloud 프로젝트**를 공유해야 합니다.
- 해당 Cloud 프로젝트에서 Google Apps Script API를 활성화해야 합니다.
- OAuth token에는 script가 요구하는 scope가 포함되어야 합니다.

이 플랫폼 요구 사항에 대한 source of truth는 Google의 setup guide입니다: [Google Apps Script API로 함수 실행하기](https://developers.google.com/apps-script/api/how-tos/execute).

Vegas는 현재 `vegas auth login`으로 생성한 user OAuth credential을 사용하여 이 backend를 인증합니다. Google은 이 실행 경로에서 Apps Script API가 service account를 지원하지 않는다고 문서화하고 있습니다.

## Backend 설정

`appsScript.serverFunctions.backend`를 `"google"`로 설정하고 Apps Script 프로젝트 ID와 script가 요구하는 scope를 지정합니다.

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
      oauthScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    },
  },
});
```

이 워크플로에서 `appsScript.manifest.oauthScopes`는 두 가지 역할을 합니다.

- 프로덕션 빌드 시 Apps Script manifest에 기록됩니다.
- Google backend로 서버 함수를 호출하기 전에 Vegas는 선택된 인증 프로필이 설정된 각 scope를 보유하고 있음을 요구합니다.

전체 설정 reference는 [공통 옵션](../config/shared-options#appsscriptserverfunctions)을 참고하세요.

## 필요한 Scope로 인증하기

Google backend에 설정한 것과 동일한 profile을 사용하고 script가 필요로 하는 각 scope를 요청하여 인증합니다.

```sh
vegas auth login ./client-secret.json \
  --profile work \
  --scope https://www.googleapis.com/auth/drive.readonly
```

Vegas는 Apps Script tooling에서 사용하는 Apps Script project-management scope를 항상 포함합니다. script에 필요한 추가 scope는 `--scope`로 명시적으로 요청해야 합니다.

저장된 credential에 `appsScript.manifest.oauthScopes`에 나열된 모든 scope가 포함되어 있지 않으면, Vegas는 실행 요청을 보내기 전에 실패하고 누락된 scope와 함께 해당 profile을 다시 인증하도록 안내합니다.

또한 cache된 access token에 Google Apps Script 실행 요청에 필요한 충분한 남은 lifetime이 없으면 Vegas가 access token을 refresh합니다.

일반적인 인증 워크플로는 [명령줄 인터페이스](./cli#인증)를 참고하세요.

## 어떤 코드가 실행되는가

Google backend는 설정된 Google Apps Script 프로젝트의 코드를 실행합니다. 현재 `vegas` 또는 `vegas preview`가 보유한 로컬 서버 아티팩트를 실행하지 않습니다.

현재 Vegas 프로덕션 출력으로 remote project를 업데이트하려면 다음을 실행합니다.

```sh
vegas build
vegas push
```

`vegas push`는 Apps Script 프로젝트 파일을 업데이트하지만 API executable deployment를 생성하거나 업데이트하지는 않습니다. deployment 관리는 Google Apps Script 측 작업으로 남습니다.

### `devMode: false`

`devMode`의 기본값은 `false`입니다. Google은 API executable deployment와 연결된 version을 실행합니다. 새 source를 push한 뒤 일반적인 Google-backed 호출에서 새로 배포된 version을 사용하려면 API executable deployment를 업데이트하세요.

### `devMode: true`

배포된 version 대신 마지막으로 저장된 project code를 Google에서 의도적으로 실행하려면 `devMode`를 `true`로 설정합니다.

```typescript
export default defineConfig({
  appsScript: {
    scriptId: "your-script-id",
    serverFunctions: {
      backend: "google",
      profile: "work",
      devMode: true,
    },
    manifest: {
      oauthScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    },
  },
});
```

Google은 development mode 실행을 script owner로 제한합니다.

## 인수와 반환값

요청을 보내기 전에 Vegas는 서버 함수 인수를 Apps Script API 경계를 통과할 수 있는 값으로 정규화합니다. 지원되는 인수 값은 다음과 같습니다.

- `null`
- string
- boolean
- 유한 number
- 지원되는 값을 포함하는 dense array
- string key와 지원되는 값만 가진 plain object

Vegas는 지원되지 않는 값을 network request를 보내기 전에 거부합니다. 예로는 `undefined`, function, symbol, bigint, 비유한 number, class instance, cyclic object graph, sparse array, array accessor, object accessor, symbol object key 등이 있습니다.

Google 또한 `scripts.run`의 parameter와 result를 basic data type으로 제한합니다. `Spreadsheet`, `Sheet`, `Document`와 같은 Apps Script service object는 이 경계를 넘어 전달할 수 없습니다. 대신 serializable application data로 반환하세요.

## 오류

Vegas는 application error와 Google 실행 machinery의 실패를 분리합니다.

Apps Script 함수 자체가 throw하면, Vegas는 Google이 반환한 error type, message, 문서화된 Apps Script stack frame을 바탕으로 일반 JavaScript Error를 재구성합니다.

인프라 오류에는 `RuntimeInfrastructureError`를 사용하며 다음과 같이 분류합니다.

| Kind | 의미 |
| --- | --- |
| `authentication` | credential, token 획득 또는 authorization이 실패했습니다. |
| `serialization` | 함수 인수를 Google 실행 요청으로 표현할 수 없습니다. |
| `timeout` | 실행 요청이 지원되는 request lifetime을 초과했거나 Google이 execution timeout을 반환했습니다. |
| `backend` | 요청을 보낼 수 없거나 Google이 일반적인 script error response 이외의 방식으로 요청을 거부했습니다. |
| `protocol` | Google이 반환한 response를 Vegas가 유효한 실행 결과로 해석할 수 없습니다. |

이 구분을 통해 application exception은 application exception으로 처리하면서 transport 및 authentication 실패를 별도로 구분할 수 있습니다.

## Local Runtime과의 관계

Google backend를 선택하면 달라지는 것은 로컬 Web 애플리케이션에서 이루어지는 서버 함수 호출뿐입니다. Vegas는 계속 로컬 개발 서버, 클라이언트 빌드, browser bridge, file watching, Local Runtime lifecycle을 실행합니다.

Vegas가 모델링하는 Apps Script API에 대해 빠른 로컬 실행을 원하면 [Local Runtime](./local-runtime)을 사용하세요. 서버 함수 호출이 의도적으로 Google Apps Script API 경계를 넘어 설정된 remote project에서 실행되기를 원하면 Google backend를 사용합니다.
