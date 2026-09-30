---
outline: deep
---

# Why Vegas

## 현대적인 GAS 개발의 과제

일반적인 빌드 도구는 Google Apps Script(GAS) 플랫폼의 고유한 제약이 아니라 열린 Web을 대상으로 설계되어 있습니다. 현대적인 개발 워크플로를 GAS에 그대로 적용하려고 하면 routing 문제, 지나치게 큰 bundle, 신뢰하기 어려운 state 관리와 같은 문제를 겪기 쉽습니다.

Vegas는 GAS 아키텍처를 존중하면서 2026년 기준의 현대적인 개발 경험을 제공하는 전용 pipeline으로 이 간극을 메우기 위해 만들어졌습니다.

## 기능 비교

| 기능                          | clasp 단독 | Vite 단독          | Vegas                  |
| :---------------------------- | :--------- | :----------------- | :--------------------- |
| 로컬 frontend dev server      | 없음       | 있음               | 있음                   |
| 로컬 Apps Script 지향 Runtime | 없음       | 없음               | 지원 API에서 사용 가능 |
| Apps Script project push      | 있음       | 없음               | 있음                   |
| Apps Script 지향 build        | 없음       | 일반적인 Web build | 있음                   |
| SPA client entry 자동 탐지    | 없음       | 기본적으로 없음    | 있음                   |

## 주요 장점

1. 신뢰할 수 있는 "Full-Bundle Refresh" (HMR만이 아님)

일반적인 Web 개발에서 HMR(Hot Module Replacement)은 매우 유용하지만 GAS global scope에서는 부분적인 module update가 오래된 state를 남겨 원인을 찾기 어려운 문제를 만들 수 있습니다. Vegas는 더 명시적인 방식을 사용합니다.

- **Clean-State Execution:**
  저장하면 Vegas가 서버 측 logic 전체를 빠르게 다시 bundle하고 로컬 Runtime context를 재시작합니다.
- **Orphaned State 없음:**
  부분적인 module update를 피함으로써 오래된 서버 측 module state를 유지하지 않고, 각 refresh를 새로 시작된 로컬 Runtime context에서 실행합니다.
- **Vite 기반:**
  빠른 rebuild에는 Vite를 사용하여 Runtime context를 재시작하면서도 Full-Bundle Refresh의 응답성을 유지합니다.

2. Native Multi-Frontend Support

실용적인 GAS application에서는 Admin Dashboard와 User Interface처럼 여러 역할을 위한 UI를 관리하는 경우가 많습니다.

- **분리된 Logic:**
  Vegas는 `admin/main.tsx`, `user/main.tsx`와 같은 독립된 entry point를 자동으로 감지합니다. 복잡한 routing과 user validation logic이 서로 얽히는 것을 방지합니다.
- **Plugin Compatibility:**
  일반적인 Vite multi-page 설정은 GAS plugin 요구 사항과 충돌하는 code-splitting을 사용할 수 있습니다. Vegas는 각 entry를 독립적이고 호환 가능한 unit으로 빌드합니다.
- **Payload 최적화:**
  frontend를 build level에서 분리하여 각 사용자가 필요한 code만 download하도록 하고, 하나의 SPA에 모든 기능을 묶은 GAS project에서 발생하기 쉬운 bundle size 증가를 피할 수 있습니다.

3. Local Apps Script Runtime

Vegas는 development와 preview 워크플로를 위한 로컬 Runtime도 제공합니다. 지원되는 서버 측 동작이 로컬 feedback loop에 참여할 수 있도록 선택된 Apps Script API를 모델링하면서도 Google 프로덕션 Runtime인 것처럼 가장하지 않습니다.

지원 범위와 동작은 service 및 method마다 다릅니다. Runtime model과 검증 정책은 [Local Runtime](./local-runtime)을, 생성된 구현 목록은 [Runtime API coverage](./runtime-api-coverage)를 참고하세요.
