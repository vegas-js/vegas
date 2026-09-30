---
outline: deep
---

# プロジェクト構成

Vegas は、ソース・Runtime Data・出力ディレクトリをプロジェクトルートから解決します。既定値はプロジェクト種別によって異なり、[設定](../config/) から変更できます。

## プロジェクト種別

Vegas は `appType` で 2 種類のプロジェクトをサポートします。

| `appType` | 用途 | 既定のクライアントディレクトリ | 既定のサーバーディレクトリ |
| --- | --- | --- | --- |
| `"spa"` | クライアントアプリを含む Apps Script プロジェクト | `src/client` | `src/server` |
| `"script"` | SPA クライアントエントリを持たない Apps Script プロジェクト | — | `src` |

既定値は `"spa"` です。

## SPA プロジェクト

一般的な SPA プロジェクトでは、クライアントと Apps Script サーバーのソースを分離します。

```text
src/
├─ client/
│  └─ main.ts
└─ server/
   └─ Code.ts
```

Vegas は 2 種類の SPA クライアントエントリを認識します。

### モジュールエントリ

`main` という名前の JavaScript または TypeScript ソースファイルはモジュールエントリとして扱われます。対応する拡張子は `.ts`、`.tsx`、`.js`、`.jsx` です。

例:

```text
src/client/main.ts        -> dist/index.html
src/client/admin/main.ts  -> dist/admin.html
```

エントリ ID は `main` を含むディレクトリから決まります。同じディレクトリに複数の `main` ファイルがあると同一のエントリ ID になるため、エラーになります。

### HTML エントリ

クライアントディレクトリ配下の HTML ファイルもエントリとして扱われます。クライアントディレクトリからの相対パスはそのまま維持されます。

```text
src/client/index.html            -> dist/index.html
src/client/admin/index.html      -> dist/admin/index.html
```

一部の `create-vegas` テンプレートはこのエントリ形式を使用します。HTML エントリからは、通常の Vite HTML エントリと同じようにクライアントモジュールを import できます。

## Script プロジェクト

クライアントアプリを持たないプロジェクトでは、`appType` を `"script"` に設定します。

```typescript
import { defineConfig } from "@vegasjs/vegas";

export default defineConfig({
  appType: "script",
});
```

既定のサーバーディレクトリは `src` になるため、最小構成は次のようになります。

```text
src/
└─ Code.ts
```

Script プロジェクトでは SPA クライアントエントリは作成されません。

## Runtime Data

ローカル Runtime Data の既定ディレクトリは、プロジェクトルート直下の `runtime` です。

```text
runtime/
└─ spreadsheet.ts
```

Vegas はこのディレクトリ内の TypeScript ファイルをローカル Runtime Data のソースとしてスキャンします。Runtime Data はアプリケーションのソースコードとは別のものです。ライフサイクルと挙動については [Local Runtime（英語）](/guide/local-runtime) を参照してください。

## 本番出力

本番アーティファクトは既定で `dist` へ書き込まれます。

```text
dist/
```

出力ディレクトリはソースではなく生成物です。本番ビルドが成功すると、既存の出力ディレクトリは新しくビルドされたアーティファクトに置き換えられます。

## ディレクトリを変更する

既定のレイアウトは次の設定オプションで変更できます。

- `root`
- `clientDir`
- `serverDir`
- `runtimeDataDir`
- `output.dir`

解決規則と既定値については [共有オプション](../config/shared-options) を参照してください。
