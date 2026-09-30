---
outline: deep
---

# Runtime アーキテクチャ

Vegas は、サーバー関数を実行するためのインターフェースと、実際に実行を行うバックエンドを分離しています。これにより、クライアントからサーバー関数を呼び出すモデルを変えることなく、ローカル Web アプリから Vegas Local Runtime または Google Apps Script プロジェクトのどちらでも利用できます。

## Runtime バックエンドの境界

内部では、どちらの実行経路も同じ Runtime バックエンドの契約を実装しています。リクエストはサーバー関数と引数を指定し、必要に応じて呼び出しコンテキストや abort signal を含みます。バックエンドはそのリクエストを解決し、結果を非同期で返します。

共有する境界は意図的に小さく保たれています。サーバー関数の呼び出しをdispatchするコードは、関数がローカルで実行されるのか、Google Apps Script を経由して実行されるのかを知る必要がありません。

## Local バックエンド

既定のバックエンドは `local` です。

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appsScript: {
    serverFunctions: {
      backend: "local",
    },
  },
});
```

サーバー関数は、現在のローカルサーバービルドを使用して Vegas Local Runtime で実行されます。Runtime Data とセッションが所有するローカルリソースは、Local Runtime のライフサイクルから提供されます。

これは高速なローカル開発で使用する通常の経路であり、`appsScript.serverFunctions` を省略した場合にも使用されます。

挙動モデル、監査方針、API coverageについては [Local Runtime](./local-runtime) を参照してください。

## Google Apps Script バックエンド

ローカル Web アプリから呼び出したサーバー関数を Google Apps Script で実行する場合は、`appsScript.serverFunctions.backend` を `"google"` に設定します。

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
      oauthScopes: ["https://www.googleapis.com/auth/script.projects"],
    },
  },
});
```

このバックエンドでは、Vegas が Apps Script の認証機能を使ってアクセストークンを取得し、設定された Apps Script プロジェクトへ関数呼び出しを送信します。

Google バックエンドでは次が必要です。

- `appsScript.scriptId`
- `appsScript.manifest.oauthScopes` に 1 つ以上の空でないエントリ

任意の `profile` では名前付き認証プロファイルを選択できます。任意の `devMode` フラグは Apps Script API の実行リクエストへそのまま渡されます。

Google 側の前提条件、認証、実行コードの選択、シリアライズ、エラーの挙動については [Google Apps Script Runtime](./google-apps-script-runtime) を参照してください。

## バックエンドの選択で変わるもの

`appsScript.serverFunctions` は、ローカル Web アプリから行われるサーバー関数呼び出しの実行先を選択します。

これは Vegas の開発環境全体をローカル実行から Google のインフラストラクチャへ切り替える設定では**ありません**。development と preview は引き続き Vegas のローカルアプリを起動し、ローカルのクライアント／サーバー成果物をビルドし、ローカルアプリのライフサイクルで使用する Local Runtime を維持します。

バックエンドが `google` の場合、ローカルアプリはサーバー関数の呼び出しだけを Local Runtime ではなく Google バックエンドへルーティングします。それ以外のローカル開発に関する処理はローカルのままです。

## Development と Preview

`vegas` / `vegas dev` / `vegas serve` と `vegas preview` は、どちらも設定されたサーバー関数バックエンドを使用します。

development と preview の違いは [開発とビルド](./development-and-build) で説明しているビルドモードです。バックエンドの選択は、ビルダーが development モードと production モードのどちらを使用するかとは独立しています。

## Build と Push

Runtime バックエンドの選択は、本番成果物の生成やアップロードの挙動には影響しません。

- `vegas build` は本番成果物を生成します。
- `vegas push` は現在の本番出力をアップロードします。

通常のワークフローでは、どちらのコマンドも設定された開発用バックエンドを通じてアプリケーションのサーバー関数を実行しません。

設定の完全なリファレンスについては [共有オプション](../config/shared-options#appsscriptserverfunctions) を参照してください。
