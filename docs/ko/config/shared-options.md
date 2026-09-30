# 공통 옵션

별도 설명이 없는 한, 이 섹션의 옵션은 모든 dev 및 build에 적용됩니다.

## root

- **타입:** `string`
- **기본값:** `process.cwd()`

프로젝트 루트 디렉터리입니다. 절대 경로나 현재 작업 디렉터리 기준의 상대 경로를 사용할 수 있습니다.

CLI root 인수와 `root`가 모두 지정된 경우 CLI root가 우선합니다. 둘 다 지정되지 않으면 Vegas는 현재 작업 디렉터리를 사용합니다.

## clientDir

- **타입:** `string`
- **기본값:** `src/client`

프런트엔드 프로그램 탐색의 시작점이 되는 디렉터리입니다.

## serverDir

- **타입:** `string`
- **기본값:** `"spa"`에서는 `src/server`, `"script"`에서는 `src`

서버(Apps Script) 프로그램 탐색의 시작점이 되는 디렉터리입니다.

SPA 프로젝트의 기본값은 `src/server`이고 script 프로젝트의 기본값은 `src`입니다.

## runtimeDataDir

- **타입:** `string`
- **기본값:** `runtime`

Local Runtime에서 사용하는 source data를 포함하는 디렉터리입니다.

## plugins

- **타입:** `PluginOption[]`

사용할 플러그인 배열입니다. Vite로 직접 전달됩니다. 플러그인에 대한 자세한 내용은 [Vite Plugin API](https://vite.dev/guide/api-plugin)를 참고하세요.

## appType

- **타입:** `"spa" | "script"`
- **기본값:** `"spa"`

애플리케이션 유형을 정의합니다.

클라이언트 엔트리 포인트가 있는 애플리케이션에는 `"spa"`를 사용하고, 클라이언트 애플리케이션이 필요 없는 Apps Script 프로젝트에는 `"script"`를 사용합니다.

## devServer

- **타입:** `object`

`vegas serve` 및 `vegas preview`에서 사용하는 로컬 서버 설정입니다. 프로덕션 빌드 출력에는 영향을 주지 않습니다.

### devServer.host

- **타입:** `string | boolean`
- **기본값:** `"localhost"`

Vegas의 두 로컬 서버가 사용하는 host name 또는 IP 주소입니다. 모든 주소에서 listen하려면 `true` 또는 `"0.0.0.0"`을 설정합니다.

로컬 개발 서버를 localhost 외부에 노출하면 다른 기기에서 로컬 Apps Script Runtime에 접근할 수 있으므로 신뢰할 수 있는 네트워크에서만 사용하세요.

### devServer.port

- **타입:** `number`
- **기본값:** `5173`

Vegas의 main local server에서 선호하는 port입니다.

port가 이미 사용 중이면 Vite가 다음 사용 가능한 port를 선택할 수 있습니다. Vegas는 paired user-content server를 시작할 때 main server가 실제로 획득한 port를 사용합니다.

`0`을 지정하면 운영체제가 사용 가능한 port를 선택합니다.

### devServer.open

- **타입:** `boolean`
- **기본값:** `false`

main server가 시작될 때 로컬 Web 앱을 브라우저에서 열지 여부입니다.

예:

```typescript
export default defineConfig({
  devServer: {
    host: true,
    port: 4173,
    open: true,
  },
});
```

## output

- **타입:** `object`

빌드 출력 설정입니다.

### output.dir

- **타입:** `string`
- **기본값:** `dist`

프로덕션 빌드 아티팩트를 기록할 디렉터리입니다. 상대 경로는 프로젝트 루트에서 해석됩니다.

기본적으로 출력 디렉터리는 프로젝트 루트의 하위 디렉터리여야 합니다. 프로젝트 루트 자체 또는 상위 디렉터리를 출력 디렉터리로 사용할 수 없습니다.

Vegas는 프로덕션 출력을 authoritative output으로 취급합니다. 빌드가 성공하면 새로운 빌드 아티팩트를 기록하기 전에 기존 출력 디렉터리를 제거합니다.

### output.allowOutsideRoot

- **타입:** `boolean`
- **기본값:** `false`

`output.dir`이 프로젝트 루트 밖으로 해석되는 것을 허용합니다.

Vegas는 성공한 프로덕션 빌드를 기록하기 전에 기존 출력 디렉터리를 제거하므로, 프로젝트 루트 외부의 출력은 명시적으로 opt-in해야 합니다.

이 옵션을 사용해도 프로젝트 루트 자체 또는 프로젝트 루트의 상위 디렉터리를 출력 디렉터리로 사용할 수는 없습니다.

예:

```typescript
export default defineConfig({
  output: {
    dir: "../dist",
    allowOutsideRoot: true,
  },
});
```

## appsScript

- **타입:** `object`

Apps Script 프로젝트 및 manifest 설정입니다.

### appsScript.scriptId

- **타입:** `string`

`vegas push`의 대상으로 사용하는 Apps Script 프로젝트 ID입니다.

여러 script ID source를 사용할 수 있는 경우 Vegas는 다음 우선순위를 사용합니다.

1. `VEGAS_SCRIPT_ID`
2. `appsScript.scriptId`
3. `.clasp.json` compatibility fallback

명시적으로 빈 script ID를 설정하면 invalid로 처리하며 더 낮은 우선순위 source로 fallback하지 않습니다.

### appsScript.serverFunctions

- **타입:** `{ backend: "local" } | { backend: "google"; profile?: string; devMode?: boolean }`
- **기본값:** `{ backend: "local" }`

development 및 preview 중 Vegas 로컬 Web 애플리케이션에서 호출된 서버 함수의 실행 backend를 선택합니다.

이 설정은 해당 서버 함수 호출이 어디에서 실행되는지만 변경합니다. 로컬 Web 애플리케이션 자체를 대체하지 않으며 `vegas build` 또는 `vegas push`의 동작도 변경하지 않습니다. 실행 경계는 현재 영어 문서의 [Runtime Architecture](/guide/runtime-architecture)를 참고하세요.

#### appsScript.serverFunctions.backend

- **타입:** `"local" | "google"`
- **기본값:** `"local"`

`"local"`은 현재 로컬 서버 빌드와 Runtime Data를 사용하여 Vegas Local Runtime에서 서버 함수를 실행합니다.

`"google"`은 Google Apps Script API를 통해 서버 함수를 실행합니다. 이 backend를 선택하면:

- `appsScript.scriptId`가 필요하며 비어 있으면 안 됩니다.
- `appsScript.manifest.oauthScopes`에는 하나 이상의 비어 있지 않은 scope가 있어야 합니다.
- Vegas는 선택된 Apps Script 인증 프로필을 통해 access token을 얻습니다.

#### appsScript.serverFunctions.profile

- **타입:** `string`
- **Backend:** `"google"`

Google 기반 서버 함수 실행에 사용할 이름이 지정된 Apps Script 인증 프로필을 선택합니다.

#### appsScript.serverFunctions.devMode

- **타입:** `boolean`
- **기본값:** `false`
- **Backend:** `"google"`

Google Apps Script API 실행 요청과 함께 전송되는 `devMode` 값을 제어합니다.

### appsScript.manifest

- **타입:** `object`

프로덕션 빌드 시 `appsscript.json`에 기록되는 Apps Script manifest 설정입니다.

Vegas는 현재 아래에 설명한 manifest field를 지원합니다. 알 수 없는 manifest 옵션은 설정을 읽을 때 거부됩니다.

#### appsScript.manifest.dependencies

- **타입:** `object`

Apps Script advanced service 및 library를 설정합니다.

##### appsScript.manifest.dependencies.enabledAdvancedServices

- **타입:** `object[]`

Apps Script 프로젝트에서 활성화할 advanced service입니다.

각 항목은 다음을 포함할 수 있습니다.

- `serviceId`: `string`
- `userSymbol`: `string`
- `version`: `string`

##### appsScript.manifest.dependencies.libraries

- **타입:** `object[]`

프로젝트에서 사용하는 Apps Script library입니다.

각 항목은 다음을 포함할 수 있습니다.

- `developmentMode`: `boolean`
- `libraryId`: `string`
- `userSymbol`: `string`
- `version`: `string`

#### appsScript.manifest.executionApi

- **타입:** `object`

API executable deployment 설정입니다. Apps Script 프로젝트가 API 실행용으로 deploy될 때 사용되는 field입니다.

##### appsScript.manifest.executionApi.access

- **타입:** `"MYSELF" | "DOMAIN" | "ANYONE" | "ANYONE_ANONYMOUS"`

Apps Script API를 통해 script를 실행할 수 있는 사용자를 제어합니다. Vegas는 생성된 `appsscript.json`에 이 값을 유지하며, `executionApi`가 생략된 경우 기본값을 추가하지 않습니다.

access level은 [Apps Script web apps and API executables manifest 문서](https://developers.google.com/apps-script/manifest/web-app-api-executable)를 참고하세요.

#### appsScript.manifest.exceptionLogging

- **타입:** `"NONE" | "STACKDRIVER"`
- **기본값:** `"STACKDRIVER"`

Apps Script 예외를 기록할 위치를 제어합니다.

#### appsScript.manifest.oauthScopes

- **타입:** `string[]`

Apps Script 프로젝트가 명시적으로 요청하는 OAuth scope입니다.

#### appsScript.manifest.runtimeVersion

- **타입:** `"STABLE" | "V8" | "DEPRECATED_ES5"`
- **기본값:** `"V8"`

생성되는 프로젝트 manifest에서 사용할 Apps Script Runtime입니다.

#### appsScript.manifest.sheets

- **타입:** `object`

Google Sheets macro 설정입니다.

##### appsScript.manifest.sheets.macros

- **타입:** `object[]`
- **`sheets`가 설정된 경우 필수**

각 macro에는 다음 항목이 필요합니다.

- `functionName`: `string`
- `menuName`: `string`

각 macro는 다음 항목을 선택적으로 포함할 수 있습니다.

- `defaultShortcut`: `string`

Vegas는 manifest 구조를 검증하고 생성된 `appsscript.json`에 macro 정의를 유지합니다. `Ctrl+Alt+Shift+Number` 형식과 같은 shortcut semantics는 Google Apps Script가 검증합니다.

macro 요구 사항은 [Apps Script Sheets macro manifest 문서](https://developers.google.com/apps-script/manifest/sheets)를 참고하세요.

#### appsScript.manifest.timeZone

- **타입:** `string`
- **기본값:** `"UTC"`

Apps Script manifest에 기록되는 time zone입니다.

#### appsScript.manifest.urlFetchWhitelist

- **타입:** `string[]`

Apps Script가 `UrlFetch` 요청으로 접근할 수 있도록 허용하는 HTTPS URL prefix입니다.

Vegas는 설정 shape를 검증하고 생성된 `appsscript.json`에 prefix를 유지합니다. manifest가 사용될 때 URL prefix 요구 사항은 Google Apps Script가 검증합니다.

field 이름은 Apps Script manifest API를 따릅니다. Google은 현재 이 개념을 allowlist라고 부르지만 manifest field 이름은 계속 `urlFetchWhitelist`입니다.

필수 URL prefix 형식은 [Apps Script allowlist 문서](https://developers.google.com/apps-script/manifest/allowlist-url)를 참고하세요.

#### appsScript.manifest.webapp

- **타입:** `object`

Web app deployment 설정입니다.

##### appsScript.manifest.webapp.access

- **타입:** `"MYSELF" | "DOMAIN" | "ANYONE" | "ANYONE_ANONYMOUS"`
- **기본값:** `"MYSELF"`

Web app에 접근할 수 있는 사용자를 제어합니다.

##### appsScript.manifest.webapp.executeAs

- **타입:** `"USER_ACCESSING" | "USER_DEPLOYING"`
- **기본값:** `"USER_ACCESSING"`

Web app이 어떤 identity로 실행되는지 제어합니다.

예:

```typescript
export default defineConfig({
  appsScript: {
    scriptId: "your-script-id",
    manifest: {
      timeZone: "Asia/Tokyo",
      runtimeVersion: "V8",
    },
  },
});
```
