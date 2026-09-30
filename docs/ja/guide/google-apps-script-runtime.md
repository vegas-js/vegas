---
outline: deep
---

# Google Apps Script Runtime

Vegas は、ローカル Web アプリからのサーバー関数呼び出しを Local Runtime で実行する代わりに、Google Apps Script へルーティングできます。このバックエンドは Google Apps Script API の `scripts.run` endpoint と、[Runtime アーキテクチャ](./runtime-architecture) で説明しているものと同じサーバー関数呼び出しモデルを使用します。

このバックエンドは、Google Apps Script プロジェクトにすでに存在するコードを意図的に実行するためのものです。呼び出しのたびに現在のメモリ上のローカルサーバービルドをアップロードするものではなく、Vegas のローカル開発環境の他の部分を置き換えるものでもありません。

## Google 側の要件

`script.run` で関数を実行する前に、Google 側でいくつかの設定が必要です。

- Apps Script プロジェクトを **API executable** としてデプロイする必要があります。
- Apps Script プロジェクトと Vegas が使用する OAuth client は、同じ**標準 Google Cloud プロジェクト**を共有する必要があります。
- その Cloud プロジェクトで Google Apps Script API を有効にする必要があります。
- OAuth tokenにはスクリプトが必要とするscopeが含まれている必要があります。

これらのプラットフォーム要件については Google のsetup guideがsource of truthです: [Google Apps Script API で関数を実行する](https://developers.google.com/apps-script/api/how-tos/execute)。

Vegas は現在、このバックエンドで `vegas auth login` によって作成したuser OAuth credentialを使用します。Google は、この実行経路の Apps Script API がservice accountに対応していないことをドキュメントで説明しています。

## バックエンドを設定する

`appsScript.serverFunctions.backend` を `"google"` に設定し、Apps Script のプロジェクト ID とスクリプトが必要とするscopeを指定します。

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

このワークフローでは、`appsScript.manifest.oauthScopes` に2つの役割があります。

- 本番ビルド時に Apps Script manifest へ書き込まれます。
- Google バックエンドでサーバー関数を呼び出す前に、Vegas は選択された認証プロファイルが設定済みの各scopeを持っていることを要求します。

設定の完全なリファレンスについては [共有オプション](../config/shared-options#appsscriptserverfunctions) を参照してください。

## 必要な scope で認証する

Google バックエンドに設定したものと同じprofileを使用し、スクリプトが必要とする各scopeを指定して認証します。

```sh
vegas auth login ./client-secret.json \
  --profile work \
  --scope https://www.googleapis.com/auth/drive.readonly
```

Vegas は Apps Script toolingで使用する Apps Script project management scope を常に追加します。スクリプトに必要な追加scopeは、`--scope` で明示的に要求する必要があります。

保存済みのcredentialに `appsScript.manifest.oauthScopes` のすべてのscopeが含まれていない場合、Vegas は実行リクエストを送信する前に失敗し、不足しているscopeを付けてそのprofileを再認証するよう案内します。

また、cache済みのアクセストークンに Google Apps Script の実行リクエストに必要な十分な残り有効期間がない場合、Vegas はアクセストークンをrefreshします。

一般的な認証ワークフローについては [コマンドラインインターフェース](./cli#認証) を参照してください。

## どのコードが実行されるか

Google バックエンドは、設定された Google Apps Script プロジェクトにあるコードを実行します。現在 `vegas` または `vegas preview` が保持しているローカルサーバー成果物は実行しません。

現在の Vegas 本番出力でリモートプロジェクトを更新するには、次を実行します。

```sh
vegas build
vegas push
```

`vegas push` は Apps Script プロジェクトのファイルを更新しますが、API executable deployment の作成や更新は行いません。deploymentの管理は Google Apps Script 側の操作です。

### `devMode: false`

`devMode` の既定値は `false` です。Google は API executable deployment に関連付けられたversionを実行します。新しいソースをpushしたあと、通常の Google バックエンド呼び出しで新しいデプロイ済みversionを使用したい場合は、API executable deploymentを更新してください。

### `devMode: true`

デプロイ済みversionではなく、最後に保存したプロジェクトコードを意図的に Google で実行する場合は、`devMode` を `true` にします。

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

Google は development mode での実行をscript ownerに制限しています。

## 引数と戻り値

リクエストを送信する前に、Vegas はサーバー関数の引数を Apps Script API の境界を越えられる値へ正規化します。対応している引数の値は次のとおりです。

- `null`
- string
- boolean
- 有限number
- 対応している値を含むdense array
- string keyと対応している値だけを持つplain object

Vegas は対応していない値を、ネットワークリクエストの送信前に拒否します。例として `undefined`、function、symbol、bigint、非有限number、class instance、循環object graph、sparse array、array accessor、object accessor、symbol object keyがあります。

Google も `scripts.run` の引数と戻り値をbasic data typeに制限しています。`Spreadsheet`、`Sheet`、`Document` などの Apps Script service objectはこの境界を越えて渡せません。代わりに、それらをシリアライズ可能なアプリケーションデータとして返してください。

## エラー

Vegas は、アプリケーションのエラーと Google 実行機構の失敗を分けて扱います。

Apps Script の関数自体がthrowした場合、Vegas は Google から返されたerror type、message、ドキュメント化された Apps Script stack frameをもとに通常の JavaScript Error を再構築します。

インフラストラクチャの失敗では `RuntimeInfrastructureError` を使用し、次のように分類します。

| Kind | 意味 |
| --- | --- |
| `authentication` | credential、token取得、authorizationのいずれかに失敗しました。 |
| `serialization` | 関数の引数を Google の実行リクエストで表現できません。 |
| `timeout` | 実行リクエストが対応するrequest lifetimeを超えたか、Google がexecution timeoutを返しました。 |
| `backend` | リクエストを送信できなかったか、通常のscript error response以外の形で Google に拒否されました。 |
| `protocol` | Google のresponseを Vegas が有効な実行結果として解釈できませんでした。 |

この分離により、アプリケーション例外はアプリケーション例外として扱いつつ、transportやauthenticationの失敗を区別できます。

## Local Runtime との関係

Google バックエンドを選択して変わるのは、ローカル Web アプリからのサーバー関数呼び出しだけです。Vegas は引き続きローカル開発サーバー、クライアントビルド、ブラウザブリッジ、ファイル監視、Local Runtime のライフサイクルを実行します。

Vegas がモデル化している Apps Script API を使って高速にローカル実行したい場合は [Local Runtime](./local-runtime) を使用してください。サーバー関数呼び出しを意図的に Google Apps Script API の境界を越えさせ、設定したリモートプロジェクトで実行したい場合は Google バックエンドを使用します。
