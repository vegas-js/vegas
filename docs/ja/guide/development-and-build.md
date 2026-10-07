---
outline: deep
---

# 開発とビルド

Vegas は development・preview・本番ビルドで同じプロジェクトモデルとビルド計画を使用しますが、それぞれライフサイクルが異なります。

| ワークフロー                        | ビルドモード | ローカル Web アプリ | プロジェクトファイルを監視 | Local Runtime を起動 | `output.dir` へ書き込み |
| ----------------------------------- | ------------ | ------------------- | -------------------------- | -------------------- | ----------------------- |
| `vegas`, `vegas dev`, `vegas serve` | development  | する                | する                       | する                 | しない                  |
| `vegas preview`                     | production   | する                | する                       | する                 | しない                  |
| `vegas build`                       | production   | しない              | しない                     | しない               | する                    |

ビルドモードは、Vegas がクライアント／サーバーアーティファクトをビルドするときに使用する Vite の mode と環境値を制御します。アーティファクトを本番出力ディレクトリへ書き込むかどうかとは別の概念です。

## Development

`vegas`、`vegas dev`、`vegas serve` は同じ開発ワークフローを開始します。

Vegas はプロジェクトを解決・スキャンし、development モードのビルダーを作成して、最初のクライアント／サーバーアーティファクトをビルドします。これらのアーティファクトはローカル Web アプリ用にメモリ上へ保持されます。

ローカルアプリの実行中、Vegas は設定されたクライアント・サーバー・Runtime Data ディレクトリを監視します。

- クライアントまたはサーバーソースの変更では、影響を受けるアプリケーションアーティファクトを再ビルドします。
- アプリケーションソースの追加／削除では、ビルドトポロジーを更新します。
- Runtime Data ソースの変更では、Local Runtime のデータを再読み込みします。

必要に応じて、クライアントの再ビルドやビルドトポロジーの変更によってブラウザも再読み込みされます。

Runtime Data のライフサイクルと対応している Apps Script の挙動については [Local Runtime](./local-runtime) を参照してください。

## Preview

`vegas preview` は、プロジェクトの監視と Local Runtime を含む development と同じローカルアプリのライフサイクルを使用しますが、ビルダーを production モードで作成します。

これにより、デプロイ用のアーティファクトを作成する前に、production モードのクライアント／サーバー出力を Vegas のローカルアプリで確認できます。

preview は `output.dir` の読み書きを**行いません**。クライアント／サーバーアーティファクトはメモリ上でビルドされるため、`vegas preview` を実行しても `dist` は更新されません。

## 本番ビルド

`vegas build` はローカル Web アプリやファイルウォッチャーを起動せず、production モードでデプロイ用アーティファクトを生成します。

Vegas はまずアプリケーションアーティファクトをメモリ上でビルドします。その後 Apps Script manifest を追加し、アーティファクト生成が成功した場合にだけ、設定された本番出力を置き換えます。

既定の出力ディレクトリは `dist` です。出力設定と安全性の規則については [プロジェクト構成](./project-structure#本番出力) と [共有オプション](../config/shared-options#output) を参照してください。

## 一般的なワークフロー

ローカル開発から Apps Script までの一般的な流れは次のとおりです。

```sh
vegas
vegas preview
vegas build
vegas push
```

編集時は development、production モードのビルドをローカルアプリで確認するときは preview、`vegas push` がアップロードする本番出力を更新するときは build を使います。

`vegas push` は `vegas build` を自動実行しません。push の挙動と認証オプションについては [コマンドラインインターフェース](./cli#push) を参照してください。
