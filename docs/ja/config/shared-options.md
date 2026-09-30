# 共有オプション

特に記載がない限り、このセクションのオプションは development と build の両方に適用されます。

## root

- **型:** `string`
- **既定値:** `process.cwd()`

プロジェクトのルートディレクトリです。絶対パス、または現在の作業ディレクトリからの相対パスを指定できます。

CLI の root 引数と `root` の両方を指定した場合は CLI の root が優先されます。どちらも指定しない場合、Vegas は現在の作業ディレクトリを使用します。

## clientDir

- **型:** `string`
- **既定値:** `src/client`

フロントエンドプログラムを探索する起点となるディレクトリです。

## serverDir

- **型:** `string`
- **既定値:** `"spa"` では `src/server`、`"script"` では `src`

サーバー（Apps Script）プログラムを探索する起点となるディレクトリです。

SPA プロジェクトの既定値は `src/server`、script プロジェクトの既定値は `src` です。

## runtimeDataDir

- **型:** `string`
- **既定値:** `runtime`

Local Runtime が使用するソースデータを格納するディレクトリです。

## plugins

- **型:** `PluginOption[]`

使用するプラグインの配列です。そのまま Vite へ渡されます。プラグインについては [Vite Plugin API](https://vite.dev/guide/api-plugin) を参照してください。

## appType

- **型:** `"spa" | "script"`
- **既定値:** `"spa"`

アプリケーション種別を定義します。

クライアントエントリを持つアプリケーションでは `"spa"`、クライアントアプリを必要としない Apps Script プロジェクトでは `"script"` を使用します。

## devServer

- **型:** `object`

`vegas serve` と `vegas preview` が使用するローカルサーバー設定です。本番ビルド出力には影響しません。

### devServer.host

- **型:** `string | boolean`
- **既定値:** `"localhost"`

Vegas の両方のローカルサーバーで使用するホスト名または IP アドレスです。すべてのアドレスで待ち受けるには `true` または `"0.0.0.0"` を指定します。

ローカル開発サーバーを localhost の外へ公開すると、ローカル Apps Script runtime が他のデバイスから到達可能になるため、信頼できるネットワークでのみ使用してください。

### devServer.port

- **型:** `number`
- **既定値:** `5173`

Vegas のメインローカルサーバーで優先して使用するポートです。

ポートがすでに使用されている場合、Vite は次の利用可能なポートを選択できます。Vegas はメインサーバーが実際に取得したポートを使って、対になる user-content サーバーを起動します。

`0` を指定すると、OS が利用可能なポートを選択します。

### devServer.open

- **型:** `boolean`
- **既定値:** `false`

メインサーバーの起動時にローカル Web アプリをブラウザで開くかどうかです。

例:

```typescript
export default defineConfig({
  devServer: {
    host: true,
    port: 4173,
    open: true,
  },
});
```

## output

- **型:** `object`

ビルド出力の設定です。

### output.dir

- **型:** `string`
- **既定値:** `dist`

本番ビルドのアーティファクトを書き込むディレクトリです。相対パスはプロジェクトルートから解決されます。

既定では、出力ディレクトリはプロジェクトルートの子である必要があります。プロジェクトルート自体や、その祖先ディレクトリを出力先にはできません。

Vegas は本番出力を正として扱います。ビルドが成功すると、新しいビルドアーティファクトを書き込む前に既存の出力ディレクトリを削除します。

### output.allowOutsideRoot

- **型:** `boolean`
- **既定値:** `false`

`output.dir` がプロジェクトルートの外側を解決することを許可します。

Vegas は本番ビルドが成功した後、書き込み前に既存の出力ディレクトリを削除するため、プロジェクトルート外への出力には明示的な許可が必要です。

このオプションを有効にしても、プロジェクトルート自体や、その祖先ディレクトリを出力先にはできません。

例:

```typescript
export default defineConfig({
  output: {
    dir: "../dist",
    allowOutsideRoot: true,
  },
});
```

## appsScript

- **型:** `object`

Apps Script プロジェクトと manifest の設定です。

### appsScript.scriptId

- **型:** `string`

`vegas push` の対象として使用する Apps Script プロジェクト ID です。

複数の script ID の取得元がある場合、Vegas は次の優先順位を使用します。

1. `VEGAS_SCRIPT_ID`
2. `appsScript.scriptId`
3. `.clasp.json` 互換フォールバック

明示的に空の script ID を設定した場合は不正な値として扱われ、優先順位の低い取得元へフォールバックしません。

### appsScript.serverFunctions

- **型:** `{ backend: "local" } | { backend: "google"; profile?: string; devMode?: boolean }`
- **既定値:** `{ backend: "local" }`

development と preview で、Vegas のローカル Web アプリから呼び出されたサーバー関数の実行バックエンドを選択します。

この設定で変わるのは、そのサーバー関数呼び出しをどこで実行するかです。ローカル Web アプリ自体を置き換えるものではなく、`vegas build` や `vegas push` にも影響しません。実行境界については [Runtime Architecture（英語）](/guide/runtime-architecture) を参照してください。

#### appsScript.serverFunctions.backend

- **型:** `"local" | "google"`
- **既定値:** `"local"`

`"local"` は、現在のローカルサーバービルドと Runtime Data を使用して、Vegas の Local Runtime でサーバー関数を実行します。

`"google"` は Google Apps Script API を通じてサーバー関数を実行します。このバックエンドを選択する場合:

- `appsScript.scriptId` が必須で、空文字列は使用できません。
- `appsScript.manifest.oauthScopes` に 1 つ以上の空でない scope が必要です。
- Vegas は選択された Apps Script 認証プロファイルから アクセストークン を取得します。

#### appsScript.serverFunctions.profile

- **型:** `string`
- **バックエンド:** `"google"`

Google バックエンドでサーバー関数を実行するときに使用する名前付き Apps Script 認証プロファイルを選択します。

#### appsScript.serverFunctions.devMode

- **型:** `boolean`
- **既定値:** `false`
- **バックエンド:** `"google"`

Google Apps Script API の実行リクエストへ送信する `devMode` の値を制御します。

### appsScript.manifest

- **型:** `object`

本番ビルド時に `appsscript.json` へ書き込む Apps Script manifest の設定です。

Vegas は現在、以下に記載する manifest フィールド をサポートします。不明な manifest オプション は設定読み込み時に拒否されます。

#### appsScript.manifest.dependencies

- **型:** `object`

Apps Script の高度なサービスとライブラリを設定します。

##### appsScript.manifest.dependencies.enabledAdvancedServices

- **型:** `object[]`

Apps Script プロジェクトで有効にする高度なサービスです。

各エントリには次を指定できます。

- `serviceId`: `string`
- `userSymbol`: `string`
- `version`: `string`

##### appsScript.manifest.dependencies.libraries

- **型:** `object[]`

プロジェクトで使用する Apps Script ライブラリです。

各エントリには次を指定できます。

- `developmentMode`: `boolean`
- `libraryId`: `string`
- `userSymbol`: `string`
- `version`: `string`

#### appsScript.manifest.executionApi

- **型:** `object`

API executable のデプロイ設定です。Apps Script プロジェクトを API 実行用にデプロイするときに使用されます。

##### appsScript.manifest.executionApi.access

- **型:** `"MYSELF" | "DOMAIN" | "ANYONE" | "ANYONE_ANONYMOUS"`

Apps Script API を通じてスクリプトを実行できる対象を制御します。Vegas は生成する `appsscript.json` にこの値をそのまま保持し、`executionApi` が省略された場合に既定値を追加しません。

アクセスレベルについては [Apps Script の Web app / API executable manifest ドキュメント](https://developers.google.com/apps-script/manifest/web-app-api-executable) を参照してください。

#### appsScript.manifest.exceptionLogging

- **型:** `"NONE" | "STACKDRIVER"`
- **既定値:** `"STACKDRIVER"`

Apps Script の例外を記録する場所を制御します。

#### appsScript.manifest.oauthScopes

- **型:** `string[]`

Apps Script プロジェクトが明示的に要求する OAuth scope です。

#### appsScript.manifest.runtimeVersion

- **型:** `"STABLE" | "V8" | "DEPRECATED_ES5"`
- **既定値:** `"V8"`

生成する プロジェクト manifest で使用する Apps Script runtime です。

#### appsScript.manifest.sheets

- **型:** `object`

Google Sheets のマクロ設定です。

##### appsScript.manifest.sheets.macros

- **型:** `object[]`
- **`sheets` を設定した場合は必須**

各マクロには次が必要です。

- `functionName`: `string`
- `menuName`: `string`

各マクロには任意で次を指定できます。

- `defaultShortcut`: `string`

Vegas は manifest の構造を検証し、生成する `appsscript.json` にマクロ定義を保持します。`Ctrl+Alt+Shift+Number` 形式などショートカットの意味上の制約は Google Apps Script が検証します。

マクロの要件については [Apps Script Sheets macro manifest ドキュメント](https://developers.google.com/apps-script/manifest/sheets) を参照してください。

#### appsScript.manifest.timeZone

- **型:** `string`
- **既定値:** `"UTC"`

Apps Script manifest に書き込むタイムゾーンです。

#### appsScript.manifest.urlFetchWhitelist

- **型:** `string[]`

Apps Script が `UrlFetch` リクエストでアクセスできる HTTPS URL prefix です。

Vegas は設定の構造を検証し、生成する `appsscript.json` にprefixを保持します。URL prefix の要件は manifest の使用時に Google Apps Script が検証します。

フィールド名は Apps Script manifest API に従っています。Google は現在この概念を allowlist と呼んでいますが、manifest フィールド は引き続き `urlFetchWhitelist` という名前です。

必要な URL prefix 形式については [Apps Script allowlist ドキュメント](https://developers.google.com/apps-script/manifest/allowlist-url) を参照してください。

#### appsScript.manifest.webapp

- **型:** `object`

Web app のデプロイ設定です。

##### appsScript.manifest.webapp.access

- **型:** `"MYSELF" | "DOMAIN" | "ANYONE" | "ANYONE_ANONYMOUS"`
- **既定値:** `"MYSELF"`

Web app にアクセスできる対象を制御します。

##### appsScript.manifest.webapp.executeAs

- **型:** `"USER_ACCESSING" | "USER_DEPLOYING"`
- **既定値:** `"USER_ACCESSING"`

Web app をどのユーザーとして実行するかを制御します。

例:

```typescript
export default defineConfig({
  appsScript: {
    scriptId: "your-script-id",
    manifest: {
      timeZone: "Asia/Tokyo",
      runtimeVersion: "V8",
    },
  },
});
```
