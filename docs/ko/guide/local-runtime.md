---
outline: deep
---

# Local Runtime

Vegas에는 개발 feedback loop를 짧게 만들기 위한 로컬 Apps Script 지향 Runtime이 포함되어 있습니다. 지원되는 서버 코드를 로컬 개발 및 preview 워크플로에서 실행할 수 있도록 선택된 Apps Script API를 모델링합니다.

Local Runtime은 Google Apps Script 프로덕션 Runtime의 복사본이 **아니며**, Google이 공개하지 않은 동작을 재현하는 것을 목표로 하지 않습니다.

Local Runtime 실행과 선택적으로 사용할 수 있는 Google Apps Script 서버 함수 backend의 관계는 [Runtime 아키텍처](./runtime-architecture)를 참고하세요.

## 사용 방법

Vegas가 현재 모델링하는 API를 사용하는 코드를 개발할 때 Local Runtime을 사용하면 빠른 feedback을 얻을 수 있습니다. 배포된 Google Apps Script는 별도의 실행 환경으로 취급하고, 그 동작은 Google이 공개한 플랫폼 계약에 따라야 합니다.

development와 preview는 같은 Local Runtime lifecycle을 사용합니다. 현재 API 목록과 구조적 coverage는 [Runtime API coverage](./runtime-api-coverage)에서 확인할 수 있습니다.

## Runtime Data

Runtime Data는 Local Runtime의 초기 상태를 선언하는 seed data입니다. Vegas는 `runtimeDataDir` 아래의 TypeScript 파일을 스캔하며, 기본 디렉터리는 프로젝트 루트의 `runtime`입니다.

각 Runtime Data 파일은 하나의 target을 가진 값을 default export해야 합니다. 현재 지원되는 target은 다음과 같습니다.

- `"Properties"`
- `"Session"`
- `"Spreadsheet"`

`"Cache"`는 향후 Runtime Data 모델을 위해 예약되어 있으며, 현재는 조용히 무시하지 않고 fail-closed 방식으로 실패합니다.

Runtime Data 파일은 **fixture이며 persistence가 아닙니다**. 서버 코드 실행 중 발생한 변경은 현재 Local Runtime session에 반영되지만, Vegas는 해당 변경을 source file에 다시 기록하지 않습니다.

### Properties

Properties fixture는 로컬 script, user, document property namespace의 초기 상태를 설정합니다.

```typescript
export default {
  target: "Properties",
  scriptProperties: {
    API_BASE_URL: "http://localhost:3000",
  },
  userProperties: {
    theme: "dark",
  },
};
```

하나의 Runtime Data snapshot에는 Properties fixture를 최대 하나만 포함할 수 있습니다.

### Session

Session fixture는 지원되는 Session API가 사용하는 로컬 invocation identity와 locale 정보를 제공합니다.

```typescript
export default {
  target: "Session",
  activeUserEmail: "developer@example.com",
  activeUserLocale: "en",
  effectiveUserEmail: "developer@example.com",
  temporaryActiveUserKey: "local-user",
};
```

하나의 Runtime Data snapshot에는 Session fixture를 최대 하나만 포함할 수 있습니다.

### Spreadsheet

각 Spreadsheet fixture는 하나의 로컬 Spreadsheet를 정의합니다. 같은 프로젝트에서 여러 Spreadsheet fixture 파일을 사용할 수 있습니다.

```typescript
export default {
  target: "Spreadsheet",
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
};
```

snapshot 안에서 Spreadsheet ID와 명시적인 URL은 각각 고유해야 합니다. 각 Spreadsheet 안에서는 Sheet ID와 이름이 고유해야 합니다. fixture 값은 선언된 grid 안에 들어가야 하며 직사각형 matrix를 이루어야 합니다.

## Session Lifecycle

Local Runtime session은 애플리케이션 실행 중 사용하는 변경 가능한 로컬 store를 소유합니다. 현재 session에는 Cache, Drive, Drive iterator, Lock, Properties, Spreadsheet 상태를 위한 store가 있습니다.

development 또는 preview가 시작되면 Vegas는 새로운 session을 만듭니다. Properties와 Spreadsheet fixture는 해당 store의 초기 상태로 사용되며, Session fixture data는 invocation environment의 일부가 됩니다.

이 구분은 중요합니다. fixture는 초기 데이터 또는 교체 데이터를 선언하고, session은 변경 가능한 Runtime state를 소유합니다. 따라서 Runtime Data source file은 Apps Script service의 backing store가 아닙니다.

## Runtime Data Reload

development와 preview에서 Vegas는 Runtime Data 디렉터리를 감시합니다. Runtime Data source를 추가, 변경 또는 삭제하면 새 snapshot을 로드하고 검증한 뒤 현재 session과 reconcile합니다.

reload는 세분화되어 있습니다.

- Properties fixture가 변경되지 않았다면 현재 Properties store의 state를 유지합니다. Properties fixture가 변경되면 fixture가 관리하는 property namespace를 새 fixture에서 교체합니다.
- Spreadsheet fixture가 변경되거나 삭제되면 해당 fixture가 소유하는 Spreadsheet를 교체하거나 제거합니다.
- 변경되지 않은 Spreadsheet state는 유지됩니다.
- 서버 코드가 생성한 Spreadsheet는 session이 소유하는 Runtime resource이며, 관련 없는 fixture reload로 제거되지 않습니다.
- Cache, Drive, Drive iterator, Lock store는 Runtime Data reload 이후에도 session 소유 상태로 유지됩니다.
- Session fixture 변경은 교체된 Runtime의 invocation environment에 반영됩니다.

Spreadsheet fixture ownership은 명시적입니다. 실행 중인 Local Runtime이 생성한 Spreadsheet와 같은 ID를 가진 fixture가 해당 Spreadsheet를 조용히 교체할 수는 없습니다. 이 충돌은 오류로 처리됩니다.

### Transactional Replacement

Runtime Data reload는 활성화되기 전에 준비됩니다. Vegas는 다음 snapshot을 로드하고 검증한 뒤, clone한 fixture-backed store와 reconcile하고 다음 Local Runtime을 생성한 후에야 새로운 invocation에 사용할 Runtime을 교체합니다.

로드, 검증, reconcile, Runtime 생성 중 하나라도 실패하면 부분적으로 업데이트하지 않고 현재 Runtime을 그대로 유지합니다.

이미 dispatch된 invocation은 해당 invocation을 수락한 Runtime에서 끝까지 실행됩니다. 교체가 성공한 이후 dispatch된 invocation은 새로운 Runtime을 사용합니다.

## Local Spreadsheet Viewer

`vegas` 또는 `vegas preview`가 실행 중이면 Local Runtime의 Spreadsheet를 Vegas 로컬 애플리케이션이 제공하는 browser 기반 viewer에서 열 수 있습니다. 로컬 Spreadsheet resource에서는 `Spreadsheet.getUrl()`이 Google Sheets URL 대신 이 로컬 viewer URL을 반환합니다.

이는 Vegas 전용 로컬 기능입니다. viewer URL은 로컬 서버가 실행 중일 때만 존재합니다.

viewer에서는 다음 작업을 할 수 있습니다.

- Sheet tab을 사용하여 로컬 Sheet 전환.
- Sheet가 충분히 큰 경우 최소 20행 × 10열을 표시하고, 입력된 셀을 포함하도록 확장하면서도 선언된 Sheet 범위를 넘지 않는 편집 가능한 grid.
- 화살표 키 및 `Tab` / `Shift+Tab`을 이용한 키보드 탐색.
- 입력 시작, `Enter` 또는 `F2`, 셀 더블클릭을 통한 편집.
- `Enter`, `Tab`, focus loss로 확정, `Escape`로 취소, `Delete` 또는 `Backspace`로 지우기.

셀 텍스트는 viewer 전용 로컬 입력 규칙에 따라 변환됩니다.

- 대소문자를 구분하지 않고 `true`와 `false`는 boolean이 됩니다.
- 유한수로 해석할 수 있는 텍스트는 number가 됩니다.
- 앞에 apostrophe를 붙이면 나머지 텍스트를 string으로 유지합니다.
- Date 셀은 viewer에서 read-only로 표시됩니다.

viewer의 편집은 Local Runtime 서버 코드가 사용하는 현재 session과 동일한 Spreadsheet store를 업데이트합니다. Runtime Data source file은 변경하지 않습니다. 이후 해당 Spreadsheet fixture가 변경되면 위에서 설명한 일반적인 fixture reload 규칙이 적용됩니다.

## 동작 범주

구조적 coverage는 어떤 method가 Vegas Runtime에 존재하는지를 나타냅니다. behavior status는 해당 method가 어떤 종류의 구현인지를 나타냅니다. 이 둘은 의도적으로 분리되어 있습니다.

| Status            | 의미                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `implemented`     | 알려진 Local Runtime 고유의 의미상 차이 없이 문서화된 public contract를 구현합니다.                                         |
| `local-emulation` | 로컬 모델 또는 로컬 플랫폼 구현을 통해 문서화된 기능을 제공하므로 관측 가능한 동작이 Google Apps Script와 다를 수 있습니다. |
| `no-op`           | 부작용을 만들지 않고 의도적으로 작업을 받아들입니다.                                                                        |
| `fail-closed`     | Vegas가 충실히 표현할 수 없는 작업에 대해 근사값을 반환하는 대신 거부합니다.                                                |

따라서 API가 구조적으로 존재하더라도 `implemented`로 분류되었다는 의미는 아닙니다.

## Audit 및 검증

Vegas는 서로 다른 두 개념을 구분합니다.

- **Audited**는 Runtime 구현과 그 behavior category가 공개된 source에 대해 검토되었음을 의미합니다.
- **Contract-tested**는 공개 문서의 계약에서 도출된 동작을 명시적인 자동화 test로 확인한다는 의미입니다.

contract test는 다음과 같은 공개 source를 사용할 수 있습니다.

- Google Apps Script 공식 문서.
- 선언된 TypeScript surface를 위한 `@types/google-apps-script`.
- RFC와 같은 공개 표준.
- Apps Script API가 Java에 정의된 동작에 명시적으로 의존하는 경우의 공개 Java specification.

### 프로덕션 Runtime을 Oracle로 사용하지 않음

Vegas는 Local Runtime 개발을 위해 Google Apps Script 프로덕션 Runtime을 behavior oracle로 사용하지 않습니다.

특히 문서화되지 않은 기본값, edge case, serialization detail, 예외 동작, 기타 내부 semantics를 발견하기 위해 프로덕션 Apps Script를 probe하고 그것을 바탕으로 compatibility behavior를 만들지 않습니다. Local Runtime은 프로덕션 환경의 reverse engineering이 아니라 공개된 contract를 근거로 합니다.

일반적인 application test를 위해 Google Apps Script에서 애플리케이션을 실행하는 것은, Vegas 자체를 위해 문서화되지 않은 동작을 발견하려고 프로덕션 Runtime을 사용하는 것과는 별개입니다.

## API Coverage 읽기

생성된 coverage 페이지는 서로 독립적인 여러 측정값을 보고합니다.

1. **구조적 method coverage** — 선언된 method 중 Vegas Runtime 구현이 존재하는 비율.
2. **Enum surface coverage** — Global Object가 공개하는 enum property와 독립된 Global enum을 결합하여 어떤 enum surface가 존재하는지.
3. **Audited behavior** — 검토된 method가 `implemented`, `local-emulation`, `no-op`, `fail-closed` 중 무엇으로 분류되는지.
4. **Contract-tested method** — audit된 method 중 공개 contract를 근거로 하는 명시적인 test가 존재하는 수.

이 수치를 하나의 compatibility score로 합쳐서는 안 됩니다. 특히 구조적 coverage가 100%라고 해서 Local Runtime의 동작이 Google Apps Script와 동일하다는 의미는 아닙니다.

## Vegas가 Fail Closed를 선택하는 이유

일부 Apps Script 동작은 Google 인프라에 의존하거나 public documentation에서 semantics가 충분히 정의되지 않았습니다. Vegas가 어떤 작업을 충실히 재현할 수 없는 경우, 그럴듯한 근사값을 반환하는 것이 명시적으로 거부하는 것보다 더 위험할 수 있습니다.

따라서 Local Runtime은 이런 경우 명시적인 오류를 우선합니다. 예로는 플랫폼 고유의 변환이나 로컬 host platform에서 충실히 표현할 수 없는 request option 등이 있습니다.

## Scope

Local Runtime은 의도적으로 점진적으로 확장됩니다. API support는 service 단위로 증가하면서 동작과 제한 사항을 명시적으로 유지합니다.

audit된 method status의 source of truth는 다음 파일입니다.

```text
scripts/runtime-api-status.json
```

생성되는 사람이 읽을 수 있는 view는 다음 파일입니다.

```text
docs/guide/runtime-api-coverage.md
```

구조적 coverage와 behavior metadata는 모두 CI에서 검증됩니다. 명시적으로 mapping된 모든 Runtime surface에는 status entry가 필요하며, 해당 surface의 모든 public method는 audit되어야 합니다. 따라서 새로운 surface나 method가 behavior classification을 조용히 우회할 수 없습니다.
