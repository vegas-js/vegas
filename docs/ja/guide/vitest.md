---
outline: deep
---

# Vitest

Vegas は、開発サーバーやブラウザを起動せずに、サーバー側のコードを Local Runtime に対してテストするための Vitest アダプターを提供します。

アダプターは `@vegasjs/vegas/vitest` から公開されています。Vegas プロジェクトを読み込み、development モードでサーバープログラムをビルドし、各テストへ新しい Local Runtime harness を提供します。

## Vitest をインストールする

Vitest は `@vegasjs/vegas` の任意の peer dependency です。テストアダプターを使うプロジェクトではインストールしてください。

```sh
pnpm add -D vitest
```

現在、アダプターは Vitest 5 に対応しています。

## 基本的なテスト

`createLocalRuntimeTest()` でテスト API を作成し、`vegas` fixture から名前を指定してサーバー関数を実行します。

```typescript
import { createLocalRuntimeTest } from "@vegasjs/vegas/vitest";
import { expect } from "vitest";

const test = createLocalRuntimeTest();

test("greets a user", async ({ vegas }) => {
  await expect(vegas.appsScript.execute("greet", ["Ada"])).resolves.toBe("Hello, Ada");
});
```

`vegas.appsScript.execute()` は関数名と任意の引数配列を受け取ります。戻り値は Local Runtime の実行結果です。

サーバープログラムは選択した Vegas プロジェクトからビルドされます。テストアダプターは Vegas の開発サーバー、ブラウザブリッジ、ファイルウォッチャー、Google バックエンドを起動しません。

## Vegas プロジェクトを選択する

既定では、`createLocalRuntimeTest()` は現在の作業ディレクトリから Vegas プロジェクトを読み込みます。

別の Vegas プロジェクトルートを使う場合は `root` を指定します。

```typescript
const test = createLocalRuntimeTest({
  root: "./examples/app",
});
```

Vegas はプロジェクト設定を読み込み、そのサーバープログラムを development モードでビルドします。このプロジェクト／プログラム環境はテスト API から再利用され、個々のテストごとに再ビルドされません。

## Runtime Data をseedする

テストで必要な Local Runtime のstateは `runtimeData` オプションで指定します。

```typescript
import { createLocalRuntimeTest, type RuntimeDataFixture } from "@vegasjs/vegas/vitest";

const runtimeData = {
  properties: {
    scriptProperties: {
      environment: "test",
    },
  },
  session: {
    activeUserEmail: "tester@example.com",
    activeUserLocale: "en",
  },
  spreadsheets: [
    {
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
    },
  ],
} satisfies RuntimeDataFixture;

const test = createLocalRuntimeTest({ runtimeData });
```

inline fixture は、Local Runtime の snapshot model と同じ検証済みの Properties・Session・Spreadsheet のデータ構造を使用します。

Vitest アダプターは、プロジェクトの `runtime/` ディレクトリからmoduleを**自動では読み込みません**。テスト用のstateは `runtimeData` で明示的に渡してください。`runtimeData` を省略した場合、空の Runtime Data fixtureからテストharnessを作成します。

## テストの分離

各テストは、新しくseedされた Local Runtime harnessを受け取ります。

あるテストで Apps Script API や公開されているstoreを通じて行った変更は、次のテストの開始stateにはなりません。

```typescript
const test = createLocalRuntimeTest({
  runtimeData: {
    properties: {
      scriptProperties: {
        prefix: "Vegas",
      },
    },
  },
});

test("can mutate state", async ({ vegas }) => {
  await vegas.appsScript.execute("setPrefix", ["Changed"]);

  await expect(vegas.appsScript.execute("getPrefix")).resolves.toBe("Changed");
});

test("starts from the fixture again", async ({ vegas }) => {
  await expect(vegas.appsScript.execute("getPrefix")).resolves.toBe("Vegas");
});
```

この分離は、各テスト用に作成される Local Runtime harness に適用されます。読み込み済みの Vegas プロジェクトとビルド済みのサーバープログラムはテスト API 内で共有されますが、変更可能な Runtime state は fixture から再作成されます。

## Harness の公開surface

`vegas` fixture は次のsurfaceを持つ `LocalRuntimeHarness` です。

| Property           | 用途                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| `appsScript`       | Local Runtime を通じてサーバー関数を実行します。                     |
| `runtime`          | 内部の `LocalRuntime` へアクセスします。                             |
| `session`          | このテストharnessが所有する `LocalRuntimeSession` へアクセスします。 |
| `propertiesStore`  | インメモリの Properties storeを直接検査・変更します。                |
| `spreadsheetStore` | インメモリの Spreadsheet storeを直接検査・変更します。               |

アプリケーションテストでは、通常 `appsScript.execute()` を通じて挙動を確認してください。より低レベルの Runtime やstoreは、stateの直接assertや Runtime 固有のsetupが必要な場合に使用できます。

## Local Runtime との関係

Vitest アダプターは Vegas のdevelopmentワークフローと同じ Local Runtime 実装を使用しますが、テストが所有するライフサイクルで動作します。

- Vegas プロジェクトとサーバープログラムをテスト API 用に読み込みます。
- inline Runtime Data を snapshot へ正規化します。
- 各テストに新しくseedした Runtime sessionとstoreを作成します。
- ブラウザや開発サーバーを起動せずにサーバー関数を実行します。

Runtime Data の意味、ライフサイクル、挙動カテゴリ、API coverage方針については [Local Runtime](./local-runtime) を参照してください。
