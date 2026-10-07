---
outline: deep
---

# 명령줄 인터페이스

Vegas는 로컬 개발, 프로덕션 빌드, 인증, 빌드 출력을 Apps Script로 push하기 위한 `vegas` 명령을 제공합니다.

## 명령

| 명령                             | 용도                                                    |
| -------------------------------- | ------------------------------------------------------- |
| `vegas [root]`                   | 로컬 개발 서버 시작                                     |
| `vegas dev [root]`               | 기본 개발 명령의 별칭                                   |
| `vegas serve [root]`             | 기본 개발 명령의 별칭                                   |
| `vegas preview [root]`           | 프로덕션 모드 빌드 파이프라인을 사용하여 로컬 서버 시작 |
| `vegas build [root]`             | 프로덕션 아티팩트 빌드                                  |
| `vegas auth login <client-file>` | Apps Script용 Google 인증                               |
| `vegas push [root]`              | 현재 프로덕션 빌드 출력을 Apps Script 프로젝트로 push   |

## 프로젝트 루트

development, preview, build, push 명령은 선택적으로 프로젝트 루트를 받을 수 있습니다.

```sh
vegas build ./my-project
```

상대 경로는 현재 작업 디렉터리를 기준으로 해석됩니다. CLI root와 `root` 설정 옵션이 모두 제공되면 CLI root가 우선합니다.

## Development

`vegas`, `vegas dev`, `vegas serve`는 모두 같은 개발 워크플로를 시작합니다.

```sh
vegas
```

Vegas는 프로젝트를 스캔하고 development topology를 빌드하며, 로컬 Web 애플리케이션을 시작하고, 지원되는 Apps Script API에 대해 설정된 로컬 Runtime Data를 사용합니다.

## Preview

`vegas preview`는 프로덕션 모드 빌드 파이프라인을 사용하여 로컬 애플리케이션을 시작합니다.

```sh
vegas preview
```

preview는 여전히 로컬 워크플로입니다. 프로젝트를 Apps Script에 push하거나 deploy하지 않습니다.

## Build

`vegas build`는 설정된 출력 디렉터리에 프로덕션 아티팩트를 생성합니다.

```sh
vegas build
```

기본 출력 디렉터리는 `dist`입니다. Vegas는 프로덕션 출력을 authoritative output으로 취급하며, 빌드에 성공하면 기존 출력 디렉터리를 교체합니다.

## 인증

`vegas auth login`은 Desktop OAuth 클라이언트 JSON 파일을 사용하여 Google에 로그인합니다.

```sh
vegas auth login ./client-secret.json
```

`--profile`을 사용하면 이름이 지정된 Apps Script 인증 프로필을 저장하고 선택할 수 있습니다.

```sh
vegas auth login ./client-secret.json --profile work
```

`--scope`를 사용하면 추가 OAuth scope를 요청할 수 있습니다. 이 옵션은 여러 번 지정할 수 있습니다.

```sh
vegas auth login ./client-secret.json \
  --scope https://www.googleapis.com/auth/script.projects \
  --scope https://www.googleapis.com/auth/drive.readonly
```

## Push

`vegas push`는 현재 프로덕션 빌드 출력을 설정된 Apps Script 프로젝트에 업로드합니다.

```sh
vegas push
```

push는 먼저 프로덕션 빌드를 실행하지 않습니다. 출력 갱신이 필요하면 push하기 전에 프로젝트를 빌드하세요.

```sh
vegas build
vegas push
```

`--profile`을 사용하면 이름이 지정된 인증 프로필을 선택할 수 있습니다.

```sh
vegas push --profile work
```

push 대상은 프로젝트의 Apps Script 설정에서 해석됩니다. `appsScript.scriptId`와 그 해석 규칙은 [공통 옵션](../config/shared-options)을 참고하세요.
