---
outline: deep
---

# 개발과 빌드

Vegas는 development, preview, production build에서 같은 프로젝트 모델과 build planning을 사용하지만 각 워크플로의 lifecycle은 다릅니다.

| 워크플로 | 빌드 모드 | 로컬 Web 앱 | 프로젝트 파일 감시 | Local Runtime 시작 | `output.dir`에 기록 |
| --- | --- | --- | --- | --- | --- |
| `vegas`, `vegas dev`, `vegas serve` | development | 예 | 예 | 예 | 아니요 |
| `vegas preview` | production | 예 | 예 | 예 | 아니요 |
| `vegas build` | production | 아니요 | 아니요 | 아니요 | 예 |

빌드 모드는 Vegas가 클라이언트 및 서버 아티팩트를 빌드할 때 사용하는 Vite mode와 환경 값을 제어합니다. 아티팩트를 프로덕션 출력 디렉터리에 기록하는지 여부와는 별개의 개념입니다.

## Development

`vegas`, `vegas dev`, `vegas serve`는 같은 개발 워크플로를 시작합니다.

Vegas는 프로젝트를 해석하고 스캔한 뒤 development mode builder를 만들고 초기 클라이언트 및 서버 아티팩트를 빌드하여 로컬 Web 애플리케이션을 위해 메모리에 유지합니다.

로컬 애플리케이션이 실행되는 동안 Vegas는 설정된 client, server, Runtime Data 디렉터리를 감시합니다.

- 클라이언트 또는 서버 소스가 변경되면 영향을 받는 애플리케이션 아티팩트를 다시 빌드합니다.
- 애플리케이션 소스가 추가되거나 제거되면 build topology를 갱신합니다.
- Runtime Data source가 변경되면 Local Runtime 데이터를 다시 로드합니다.

필요한 경우 클라이언트 rebuild와 build topology 변경으로 브라우저도 다시 로드됩니다.

Runtime Data lifecycle과 지원되는 Apps Script 동작은 현재 영어 문서의 [Local Runtime](/guide/local-runtime)을 참고하세요.

## Preview

`vegas preview`는 프로젝트 감시와 Local Runtime을 포함해 development와 같은 로컬 애플리케이션 lifecycle을 사용하지만 builder를 production mode로 생성합니다.

이를 통해 deployment 아티팩트를 만들기 전에 production mode의 클라이언트 및 서버 출력을 Vegas 로컬 애플리케이션에서 확인할 수 있습니다.

preview는 `output.dir`을 읽거나 쓰지 **않습니다**. 클라이언트 및 서버 아티팩트는 메모리에서 빌드되므로 `vegas preview`를 실행해도 `dist`는 갱신되지 않습니다.

## 프로덕션 빌드

`vegas build`는 로컬 Web 애플리케이션이나 파일 watcher를 시작하지 않고 production mode로 deployment 아티팩트를 생성합니다.

Vegas는 먼저 애플리케이션 아티팩트를 메모리에서 빌드합니다. 그다음 생성된 Apps Script manifest를 추가하고, 아티팩트 생성에 성공한 경우에만 설정된 프로덕션 출력을 교체합니다.

기본 출력 디렉터리는 `dist`입니다. 출력 설정과 안전 규칙은 [프로젝트 구조](./project-structure#프로덕션-출력) 및 [공통 옵션](../config/shared-options#output)을 참고하세요.

## 일반적인 워크플로

로컬 개발에서 Apps Script까지의 일반적인 흐름은 다음과 같습니다.

```sh
vegas
vegas preview
vegas build
vegas push
```

편집할 때는 development를 사용하고, production mode 빌드를 로컬 애플리케이션에서 확인할 때는 preview를 사용하며, `vegas push`가 업로드할 프로덕션 출력을 갱신할 때는 build를 사용합니다.

`vegas push`는 `vegas build`를 자동으로 실행하지 않습니다. push 동작과 인증 옵션은 [명령줄 인터페이스](./cli#push)를 참고하세요.
