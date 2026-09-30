---
outline: deep
---

# プロジェクトの思想

## Developer Experience（DX）: フィードバックループを短くする

GAS 開発では、コードを書いてから結果を確認するまでの待ち時間が開発を妨げることがあります。Vegas は、モダンなWeb開発に近い即時性のあるフィードバックを GAS ecosystemへ持ち込みます。

- **待ち時間を減らす:**
  Vegas は保存後すぐにコードを実行できるローカルRuntimeを提供し、「pushして待つ」サイクルを減らします。
- **高速なiteration:**
  短いフィードバックループによって、インフラストラクチャの待ち時間ではなくapplication logicへ集中できます。

## Local Runtime: 開発時のフィードバックを速くする

remote executionだけに依存するとiterationは遅くなります。そのため Vegas は、対応している Apps Script の挙動をdevelopmentとpreviewのフィードバックループへ参加させる Local Runtimeを提供します。

- **Contract-Firstな挙動:**
  Runtimeの挙動は、Google Apps Script公式ドキュメント、公開標準、ドキュメント化されたupstream仕様など、公開された契約を根拠に実装します。
- **明示的な挙動カテゴリ:**
  監査済みmethodは、構造上存在するすべてのmethodを同等に扱うのではなく、`implemented`、`local-emulation`、意図的な`no-op`、`fail-closed`を区別します。
- **本番Runtimeを挙動のオラクルにしない:**
  Local Runtimeのために、Google Apps Script本番Runtimeをprobeしてドキュメント化されていない挙動を発見することはしません。

Runtimeと検証modelの全体については [Local Runtime](./local-runtime) を参照してください。

## Architectural Scalability: Multi-Frontend Strategy

1つの GAS project内で複数のuser interfaceを管理すると、従来は大きな複雑さが生じます。Vegas は専用のmulti-entry detection systemによってこの問題を扱います。

- **Logicの分離:**
  UserとAdminのような独立したentrypointによって、authenticationやrouting logicが絡み合って管理不能になることを防ぎます。
- **GAS Plugin向けの最適化:**
  一般的な Vite のmulti-page設定では、GAS固有の要件と競合する形でcodeが分割される場合があります。Vegas は各frontendを独立したcleanなunitとしてbuildします。
- **Payloadの最適化:**
  役割ごとに独立したSPAをbuildすることでbundle sizeの増大を避け、各userが必要なcodeだけをdownloadできるようにします。

## 統合された Apps Script ワークフロー

Vegas は各責務を明示したまま、ローカル開発から本番projectへのpushまでの開発経路全体を扱うよう設計されています。

- **ローカル開発とbuild:**
  Vegas はdevelopment server、対応API向けのローカル Apps Script Runtime、本番build pipelineを提供します。
- **Native Apps Script Push:**
  本番build outputは `vegas push` で Apps Script projectへ直接pushできます。
- **移行時の互換性:**
  既存projectはVegas固有の `appsScript.scriptId` 設定へ移行しながら、`.clasp.json` のscript IDを引き続き利用できます。
