---
outline: deep
---

# 프로젝트 철학

## Developer Experience(DX): Feedback Loop 단축

GAS 개발은 코드를 작성한 뒤 결과를 확인하기까지의 지연 때문에 흐름이 끊기는 경우가 많습니다. Vegas는 현대적인 Web 개발에 가까운 빠른 feedback을 GAS ecosystem에 제공합니다.

- **지연 감소:**
  Vegas는 저장 후 즉시 코드를 실행할 수 있는 로컬 Runtime을 제공하여 "push하고 기다리는" 반복을 줄입니다.
- **빠른 Iteration:**
  짧은 feedback loop를 통해 infrastructure overhead보다 application logic에 집중할 수 있습니다.

## Local Runtime: 더 빠른 개발 Feedback

remote execution에만 의존하면 iteration이 느려집니다. 따라서 Vegas는 지원되는 Apps Script 동작을 development 및 preview feedback loop에 참여시킬 수 있는 로컬 Runtime을 제공합니다.

- **Contract-First 동작:**
  Runtime 동작은 Google Apps Script 공식 문서, 공개 표준, 문서화된 upstream specification과 같은 공개 contract를 근거로 구현합니다.
- **명시적인 동작 범주:**
  audit된 method는 구조적으로 존재하는 모든 method를 동일하게 취급하지 않고 `implemented`, `local-emulation`, 의도적인 `no-op`, `fail-closed`를 구분합니다.
- **Behavioral Oracle 없음:**
  Vegas는 Local Runtime을 위해 Google Apps Script 프로덕션 Runtime을 probe하여 문서화되지 않은 동작을 발견하지 않습니다.

전체 Runtime 및 검증 model은 [Local Runtime](./local-runtime)을 참고하세요.

## Architectural Scalability: Multi-Frontend Strategy

하나의 GAS project 안에서 여러 user interface를 관리하면 전통적으로 큰 복잡성이 발생합니다. Vegas는 전용 multi-entry detection system으로 이 문제를 다룹니다.

- **분리된 Logic:**
  User와 Admin처럼 독립된 entry point는 authentication 및 routing logic이 서로 얽혀 관리하기 어려워지는 것을 방지합니다.
- **GAS Plugin에 최적화:**
  일반적인 Vite multi-page 설정은 GAS 고유 요구 사항과 충돌하는 방식으로 code를 split할 수 있습니다. Vegas는 각 frontend를 깨끗하고 독립적인 unit으로 빌드합니다.
- **Payload 최적화:**
  역할별로 독립된 SPA를 빌드하여 bundle size 증가를 막고, 각 사용자가 자신의 환경에 필요한 code만 download하도록 합니다.

## 통합된 Apps Script 워크플로

Vegas는 각 책임을 명시적으로 유지하면서 로컬 개발에서 프로덕션 project로의 push까지 전체 개발 경로를 다루도록 설계되어 있습니다.

- **로컬 개발 및 Build:**
  Vegas는 development server, 지원 API를 위한 로컬 Apps Script 지향 Runtime, 프로덕션 build pipeline을 제공합니다.
- **Native Apps Script Push:**
  프로덕션 build output은 `vegas push`로 Apps Script project에 직접 push할 수 있습니다.
- **Migration Compatibility:**
  기존 project는 Vegas 고유의 `appsScript.scriptId` 설정으로 이동하는 동안 `.clasp.json`의 script ID를 계속 사용할 수 있습니다.
