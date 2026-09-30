---
outline: deep
---

# はじめに

## 概要

Vegas（Vite + GAS）は、モダンなプロジェクトを Google Apps Script プラットフォーム上へ持ち込む、専用の開発フローを統合した開発・ビルドツールです。

- [Vite](https://vite.dev) を利用し、対応している Apps Script API をローカルで実行できる Apps Script 向けランタイムを備えた開発サーバー。

- フロントエンドとサーバーコードを Apps Script に特化したバンドルを生成する本番ビルドパイプライン。

- ビルド成果物を Apps Script プロジェクトへ直接送るための Apps Script 認証・push コマンド。

Vegas は一般的なプロジェクト構成に既定値を用意しているため、多くのプロジェクトでは設定を追加せずに開始できます。利用可能な設定については [Vegas の設定](../config/) を参照してください。

Vegas の設定から Vite プラグインを渡せるため、フレームワーク統合やその他の Vite プラグインをクライアントビルドへ参加させられます。

プロジェクトの設計背景については、現時点では英語版の [Why Vegas](/guide/why) で詳しく説明しています。

## 最初の Vegas プロジェクトを生成する

::: code-group

```sh [npm]
$ npm create vegas@latest
```

```sh [pnpm]
$ pnpm create vegas
```

:::

表示される質問に沿って進めてください。

## SPA エントリポイント

Vegas では、Vite で一般的なプロジェクトルート直下の `index.html` は必須ではありません。SPA のエントリは設定されたクライアントディレクトリ配下に置きます。既定値は `src/client` です。

Vegas は 2 種類のエントリ形式をサポートします。

- `main.ts`、`main.tsx`、`main.js`、`main.jsx` という名前のモジュールエントリ。Vegas が対応する HTML アーティファクトを生成します。
- クライアントディレクトリ配下の実 `.html` エントリ。Vegas はクライアントディレクトリからの相対 HTML パスをビルドエントリとして維持します。

これにより、生成されたホスト HTML を使う構成と HTML を起点にする構成の両方を扱いつつ、クライアントのエントリポイントを Apps Script のサーバーソースから分離できます。ネストしたエントリを使えば、1 つの Apps Script プロジェクト内に複数のフロントエンドを配置することもできます。

既定のレイアウトとエントリポイントの規則については [プロジェクト構成](./project-structure) を参照してください。

## コマンドラインインターフェース

Vegas をインストールしたプロジェクトでは、npm scripts から `vegas` バイナリを使用するか、`npx vegas` で直接実行できます。`create-vegas` で作成したプロジェクトには、既定で次の npm scripts が含まれます。

::: code-group

```json [package.json]
{
  "scripts": {
    "dev": "vegas",
    "build": "vegas build",
    "preview": "vegas preview",
    "login": "vegas auth login",
    "push": "vegas push"
  }
}
```

:::

利用できるコマンド、エイリアス、root 引数、認証オプションについては [コマンドラインインターフェース](./cli) を参照してください。

## Apps Script へ push する

`vegas.config.ts` に Apps Script のプロジェクト ID を設定します。

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appsScript: {
    scriptId: "your-script-id",
    manifest: {},
  },
});
```

Google の Desktop OAuth クライアント JSON ファイルを使って一度認証します。

```bash
npm run login -- ./client-secret.json
```

その後、プロジェクトをビルドして push します。

```bash
npm run build
npm run push
```

`vegas push` は、現在の本番ビルド出力を正として、設定された Apps Script プロジェクトへアップロードします。
