---
outline: deep
---

# コマンドラインインターフェース

Vegas は、ローカル開発・本番ビルド・認証・Apps Script へのビルド出力の push を行う `vegas` コマンドを提供します。

## コマンド

| コマンド | 目的 |
| --- | --- |
| `vegas [root]` | ローカル開発サーバーを起動する |
| `vegas dev [root]` | 既定の開発コマンドのエイリアス |
| `vegas serve [root]` | 既定の開発コマンドのエイリアス |
| `vegas preview [root]` | production モードのビルドパイプラインを使ってローカルサーバーを起動する |
| `vegas build [root]` | 本番アーティファクトをビルドする |
| `vegas auth login <client-file>` | Apps Script 用に Google へ認証する |
| `vegas push [root]` | 現在の本番ビルド出力を Apps Script プロジェクトへ push する |

## プロジェクトルート

development、preview、build、push コマンドには、任意でプロジェクトルートを指定できます。

```sh
vegas build ./my-project
```

相対パスの root は現在の作業ディレクトリから解決されます。CLI の root と設定の `root` の両方を指定した場合は、CLI の root が優先されます。

## 開発

`vegas`、`vegas dev`、`vegas serve` は同じ開発ワークフローを開始します。

```sh
vegas
```

Vegas はプロジェクトをスキャンして development 用のビルド構成を作成し、ローカル Web アプリを起動します。対応している Apps Script API には、設定されたローカル Runtime Data が使用されます。

## Preview

`vegas preview` は production モードのビルドパイプラインを使ってローカルアプリを起動します。

```sh
vegas preview
```

preview もローカルのワークフローです。Apps Script への push やデプロイは行いません。

## Build

`vegas build` は、設定された出力ディレクトリへ本番アーティファクトを生成します。

```sh
vegas build
```

既定の出力ディレクトリは `dist` です。Vegas は本番出力を正として扱い、ビルドが成功した後に既存の出力ディレクトリを置き換えます。

## 認証

`vegas auth login` は Desktop OAuth クライアント JSON ファイルを使って Google にログインします。

```sh
vegas auth login ./client-secret.json
```

`--profile` を指定すると、名前付きの Apps Script 認証プロファイルとして保存・選択できます。

```sh
vegas auth login ./client-secret.json --profile work
```

追加の OAuth scope を要求するには `--scope` を使います。このオプションは複数回指定できます。

```sh
vegas auth login ./client-secret.json \
  --scope https://www.googleapis.com/auth/script.projects \
  --scope https://www.googleapis.com/auth/drive.readonly
```

## Push

`vegas push` は、現在の本番ビルド出力を設定された Apps Script プロジェクトへアップロードします。

```sh
vegas push
```

push の前に本番ビルドは自動実行されません。出力を更新する必要がある場合は、先にプロジェクトをビルドしてください。

```sh
vegas build
vegas push
```

名前付きの認証プロファイルを選択するには `--profile` を使用します。

```sh
vegas push --profile work
```

push 先はプロジェクトの Apps Script 設定から解決されます。`appsScript.scriptId` とその解決規則については [共有オプション](../config/shared-options) を参照してください。
