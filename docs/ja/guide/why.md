---
outline: deep
---

# Why Vegas

## モダンな GAS 開発の課題

一般的なビルドツールはopen webを対象に設計されており、Google Apps Script（GAS）プラットフォーム固有の制約を前提としていません。モダンな開発ワークフローをそのまま GAS に当てはめようとすると、routingの破綻、不要に大きなbundle、不安定なstate管理などの問題が起こることがあります。

Vegas はこの隔たりを埋めるため、GAS のアーキテクチャを尊重しながら、2026年時点のモダンな開発体験を提供する専用pipelineとして作られました。

## 機能比較

| 機能 | clasp 単体 | Vite 単体 | Vegas |
| :--- | :--- | :--- | :--- |
| ローカルfrontend dev server | なし | あり | あり |
| ローカル Apps Script 向け Runtime | なし | なし | 対応APIで利用可能 |
| Apps Script projectへのpush | あり | なし | あり |
| Apps Script 向けbuild | なし | 一般的なWeb build | あり |
| SPA client entryの自動検出 | なし | 既定ではなし | あり |

## 主な利点

### 1. 信頼できる「Full-Bundle Refresh」（HMRだけではない）

一般的なWeb開発では HMR（Hot Module Replacement）が非常に便利ですが、GAS のglobal scopeでは部分的なmodule更新が古いstateを残し、原因の分かりにくい問題につながる可能性があります。Vegas はより明示的な方法を取ります。

- **Clean-State Execution:**
  保存時にサーバー側logic全体を高速に再bundleし、ローカルRuntime contextを再起動します。
- **Orphaned Stateを残さない:**
  部分的なmodule更新を避けることで、古いサーバー側module stateを維持せず、各refreshを新しく開始されたローカルRuntime contextで実行します。
- **Viteベース:**
  高速なrebuildには Vite を使用し、Runtime contextを再起動しながら Full-Bundle Refresh の応答性を維持します。

### 2. Native Multi-Frontend Support

実用的な GAS applicationでは、Admin DashboardとUser Interfaceのように、複数の役割向けUIを管理することがあります。

- **Logicの分離:**
  Vegas は `admin/main.tsx` や `user/main.tsx` のような独立したentrypointを自動検出します。複雑なroutingやuser validation logicが互いに絡み合うことを防ぎます。
- **Plugin Compatibility:**
  一般的な Vite のmulti-page設定では、GAS向けpluginの要件と競合するcode-splittingが発生する場合があります。Vegas は各entryを独立した互換unitとしてbuildします。
- **Payloadの最適化:**
  frontendをbuild levelで分離することで、各userは必要なcodeだけをdownloadできます。1つのSPAへすべてをまとめたGAS projectで起こりやすいbundle sizeの増大を避けられます。

### 3. Local Apps Script Runtime

Vegas はdevelopmentとpreview用にローカルRuntimeも提供します。対応している Apps Script API をモデル化し、Google の本番Runtimeを再現したかのように扱うことなく、対応するサーバー側の挙動をローカルのfeedback loopへ参加させます。

対応範囲と挙動はserviceやmethodごとに異なります。Runtime modelと検証方針については [Local Runtime](./local-runtime) を、生成された実装一覧については [Runtime API coverage](./runtime-api-coverage) を参照してください。
