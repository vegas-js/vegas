---
outline: deep
---

# Local Runtime

Vegas には、開発時のフィードバックループを短くするためのローカル Apps Script 向け Runtime が含まれています。対応しているサーバーコードをローカル開発や preview のワークフローで実行できるよう、選択した Apps Script API をモデル化しています。

Local Runtime は Google Apps Script の本番 Runtime のコピーでは**ありません**。Google が公開していない挙動を再現することも目的としていません。

Local Runtime の実行と、任意で使用できる Google Apps Script サーバー関数バックエンドとの関係については [Runtime アーキテクチャ](./runtime-architecture) を参照してください。

## 使い方

Vegas が現在モデル化している API を使用するコードの開発では、Local Runtime を使って素早くフィードバックを得られます。一方、デプロイされた Google Apps Script は別の実行環境として扱い、その挙動は Google が公開しているプラットフォームの契約に従うものとしてください。

development と preview は同じ Local Runtime のライフサイクルを使用します。現在の API 一覧と構造上の coverage は [Runtime API coverage](./runtime-api-coverage) で確認できます。

## Runtime Data

Runtime Data は、Local Runtime の初期状態を宣言するためのseed dataです。Vegas は `runtimeDataDir` 配下の TypeScript ファイルをスキャンします。既定のディレクトリはプロジェクトルートの `runtime` です。

各 Runtime Data ファイルは、1 つのtargetを持つ値を default export する必要があります。現在対応しているtargetは次のとおりです。

- `"Properties"`
- `"Session"`
- `"Spreadsheet"`

`"Cache"` は将来の Runtime Data モデル用に予約されており、現在は黙って無視せず fail-closed として失敗します。

Runtime Data ファイルは**フィクスチャであり、永続化ストレージではありません**。サーバーコードの実行中に行った変更は現在の Local Runtime セッションへ反映されますが、Vegas がその変更をソースファイルへ書き戻すことはありません。

### Properties

Properties フィクスチャは、ローカルの script・user・document property namespace の初期状態を設定します。

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

1 つの Runtime Data snapshot に含められる Properties フィクスチャは最大 1 つです。

### Session

Session フィクスチャは、対応している Session API が使用するローカルの呼び出しidentityとlocale情報を提供します。

```typescript
export default {
  target: "Session",
  activeUserEmail: "developer@example.com",
  activeUserLocale: "en",
  effectiveUserEmail: "developer@example.com",
  temporaryActiveUserKey: "local-user",
};
```

1 つの Runtime Data snapshot に含められる Session フィクスチャは最大 1 つです。

### Spreadsheet

各 Spreadsheet フィクスチャは 1 つのローカル Spreadsheet を定義します。同じプロジェクトで複数の Spreadsheet フィクスチャファイルを使用できます。

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

snapshot内では Spreadsheet ID と明示的な URL がそれぞれ一意である必要があります。各 Spreadsheet 内では Sheet ID と名前が一意である必要があります。フィクスチャの値は宣言したgrid内に収まり、長方形のmatrixを形成する必要があります。

## セッションのライフタイム

Local Runtime セッションは、アプリケーションの実行中に使用する変更可能なローカルstoreを所有します。現在のセッションには、Cache・Drive・Drive iterator・Lock・Properties・Spreadsheet のstateを保持するstoreがあります。

development または preview の開始時に、Vegas は新しいセッションを作成します。Properties と Spreadsheet のフィクスチャは対応するstoreの初期状態として使用され、Session フィクスチャのデータは呼び出し環境の一部になります。

この区別は重要です。フィクスチャは初期データまたは置換データを宣言し、セッションは変更可能な Runtime state を所有します。そのため Runtime Data ソースファイルが Apps Script service のbacking storeになることはありません。

## Runtime Data の再読み込み

development と preview では、Vegas が Runtime Data ディレクトリを監視します。Runtime Data ソースを追加・変更・削除すると、新しいsnapshotを読み込んで検証し、現在のセッションとreconcileします。

再読み込みは細かな単位で行われます。

- Properties フィクスチャに変更がなければ、現在の Properties store のstateを維持します。Properties フィクスチャが変更された場合は、フィクスチャが管理するproperty namespaceを新しいフィクスチャから置き換えます。
- Spreadsheet フィクスチャを変更または削除した場合、そのフィクスチャが所有する Spreadsheet を置換または削除します。
- 変更されていない Spreadsheet のstateは維持します。
- サーバーコードが作成した Spreadsheet はセッションが所有する Runtime resource であり、無関係なフィクスチャの再読み込みでは削除されません。
- Cache・Drive・Drive iterator・Lock のstoreは、Runtime Data の再読み込み後もセッション所有のまま維持されます。
- Session フィクスチャの変更は、置換後の Runtime の呼び出し環境へ反映されます。

Spreadsheet フィクスチャのownershipは明示的です。実行中の Local Runtime が作成した Spreadsheet と同じ ID を持つフィクスチャによって、その Spreadsheet を暗黙に置き換えることはできません。この競合はエラーになります。

### Transactional な置換

Runtime Data の再読み込みは、有効になる前に準備されます。Vegas は次のsnapshotを読み込んで検証し、cloneしたフィクスチャ管理storeへreconcileし、次の Local Runtime を作成したあとで、新しい呼び出しに使用する Runtime を置き換えます。

読み込み・検証・reconcile・Runtime作成のいずれかが失敗した場合、途中まで更新された状態にはせず、現在の Runtime がそのまま有効であり続けます。

すでにdispatchされた呼び出しは、その呼び出しを受け付けた Runtime 上で最後まで実行されます。置換が成功した後にdispatchされた呼び出しは、新しい Runtime を使用します。

## Local Spreadsheet Viewer

`vegas` または `vegas preview` の実行中は、Local Runtime の Spreadsheet を Vegas のローカルアプリが提供するブラウザベースのviewerで開けます。ローカルの Spreadsheet resourceでは、`Spreadsheet.getUrl()` が Google Sheets の URL ではなく、このローカルviewerの URL を返します。

これは Vegas 固有のローカル機能です。viewer URL はローカルサーバーの実行中だけ存在します。

viewerでは次の操作ができます。

- Sheet tabでローカル Sheet を切り替える。
- Sheet が十分に大きい場合は最低 20 行 × 10 列を表示し、入力済みのセルを含むように拡張しながら、宣言された Sheet の範囲を超えない編集可能なgrid。
- 矢印キーと `Tab` / `Shift+Tab` によるキーボード操作。
- 入力の開始、`Enter` または `F2`、セルのダブルクリックによる編集。
- `Enter`、`Tab`、focus loss で確定、`Escape` でキャンセル、`Delete` または `Backspace` でクリア。

セルのテキストはviewer固有のローカル入力規則で変換されます。

- 大文字／小文字を区別せず `true` と `false` はbooleanになります。
- 有限数として解釈できるテキストはnumberになります。
- 先頭にapostropheを付けると、残りのテキストをstringのまま保持できます。
- Date セルはviewerではread-onlyで表示されます。

viewerでの編集は、Local Runtime のサーバーコードが使用する現在のセッションと同じ Spreadsheet store を更新します。Runtime Data ソースファイルは変更しません。その後、対応する Spreadsheet フィクスチャを変更した場合は、前述の通常のフィクスチャ再読み込み規則が適用されます。

## 挙動カテゴリ

構造上のcoverageは、あるmethodが Vegas Runtime に存在するかを示します。挙動statusは、そのmethodがどの種類の実装であるかを示します。この2つは意図的に分離されています。

| Status | 意味 |
| --- | --- |
| `implemented` | Local Runtime 固有の既知の意味上の差異がなく、公開されている契約を実装しています。 |
| `local-emulation` | ローカルモデルまたはローカルプラットフォームの実装によって公開された機能を提供するため、観測可能な挙動が Google Apps Script と異なる場合があります。 |
| `no-op` | 副作用を発生させず、意図的に操作だけを受け付けます。 |
| `fail-closed` | Vegas が忠実に表現できない操作について、近似値を返す代わりに拒否します。 |

そのため API が構造上存在していても、`implemented` に分類されているとは限りません。

## 監査と検証

Vegas は次の2つの概念を分けて扱います。

- **Audited（監査済み）** は、Runtime 実装とその挙動カテゴリが公開情報と照合済みであることを意味します。
- **Contract-tested（契約テスト済み）** は、公開ドキュメントから導かれる契約を明示的な自動テストで確認していることを意味します。

contract testでは、次のような公開情報を利用できます。

- Google Apps Script の公式ドキュメント。
- 宣言された TypeScript surfaceについての `@types/google-apps-script`。
- RFC などの公開標準。
- Apps Script API が Java で定義された挙動へ明示的に依存する場合の、公開されている Java 仕様。

### 本番 Runtime をオラクルとして使用しない

Vegas は Local Runtime の開発で、Google Apps Script の本番 Runtime を挙動のオラクルとして使用しません。

特に、ドキュメント化されていない既定値・edge case・シリアライズの詳細・例外挙動・その他の内部的な意味を発見するために本番 Apps Script をprobeし、それをもとに互換挙動を作ることはありません。Local Runtime は本番環境のreverse engineeringではなく、公開された契約を根拠にします。

通常のアプリケーションテストとして Google Apps Script 上でアプリケーションを実行することは、Vegas 自体のためにドキュメント化されていない挙動を発見する目的で本番 Runtime を使用することとは別です。

## API coverage の読み方

生成されたcoverageページでは、互いに独立した複数の指標を報告します。

1. **構造上のmethod coverage** — 宣言されたmethodのうち、Vegas Runtime に実装が存在する割合。
2. **Enum surface coverage** — Global Object が公開するenum propertyと、単独のGlobal enumを組み合わせた、存在するenum surface。
3. **監査済みの挙動** — 監査済みmethodが `implemented`・`local-emulation`・`no-op`・`fail-closed` のどれに分類されているか。
4. **契約テスト済みmethod** — 監査済みmethodのうち、公開された契約を根拠とする明示的なtestが存在する数。

これらの数値を1つの互換性scoreへまとめるべきではありません。特に構造上のcoverageが100%であっても、Local Runtime の挙動が Google Apps Script と同一であることを意味しません。

## Vegas が fail-closed を選ぶ理由

Apps Script の挙動には、Google のインフラストラクチャへ依存するものや、公開ドキュメントで意味が十分に定義されていないものがあります。Vegas が操作を忠実に再現できない場合、もっともらしい近似値を返す方が、明示的に拒否するより危険なことがあります。

そのため Local Runtime は、このような場合に明示的なエラーを優先します。例として、プラットフォーム固有の変換や、ローカルhost platformでは忠実に表現できないrequest optionなどがあります。

## スコープ

Local Runtime は意図的に段階的に拡張されています。API supportはservice単位で増やしながら、挙動と制約を明示し続けます。

監査済みmethod statusのsource of truthは次のファイルです。

```text
scripts/runtime-api-status.json
```

生成される人間向けの表示は次のファイルです。

```text
docs/guide/runtime-api-coverage.md
```

構造上のcoverageと挙動metadataは、どちらもCIで検証されます。明示的にmappingされたすべての Runtime surfaceにはstatus entryが必要で、そのsurface上のすべてのpublic methodは監査済みである必要があります。そのため、新しいsurfaceやmethodが挙動分類を暗黙に迂回することはできません。
