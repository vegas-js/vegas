---
outline: deep
---

# Playwright

Vegas は、ローカル Web アプリと Local Runtime をブラウザレベルでテストするための Playwright アダプターを提供します。

アダプターは `@vegasjs/vegas/playwright` から公開されています。各テストごとに分離されたbrowser harnessを作成し、一時的なoriginでローカル Web アプリを起動して、描画されたuser applicationを1つの `Locator` として公開します。

## Playwright をインストールする

Playwright は `@vegasjs/vegas` の任意の peer dependency です。browser test adapterを使うプロジェクトではインストールしてください。

```sh
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Playwright の設定で使用するbrowserをインストールしてください。Vegas がテスト実行時のbrowserを選択することはなく、通常の Playwright 設定によって制御されます。

## 基本的なテスト

`createBrowserTest()` でテスト API を作成し、`vegas.app` を通じてアプリケーションを操作します。

```typescript
import { createBrowserTest, expect } from "@vegasjs/vegas/playwright";

const test = createBrowserTest();

test("updates the greeting", async ({ vegas }) => {
  await vegas.app.getByRole("button", { name: "Update greeting" }).click();

  await expect(vegas.app.locator("#result")).toHaveText("Hello from Vegas");
});
```

`vegas.app` はuser HTML documentの `body` をrootとする Playwright `Locator` です。このrootから通常どおりlocatorをchainし、Playwrightのassertionを使用できます。

Vegas はbrowser fixtureから内部のiframe構造を意図的に隠しています。通常のアプリケーションテストでは、host・sandbox・user HTML frameがどのようにネストしているかを知る必要はありません。

## Browser Harness がテストするもの

`createBrowserTest()` で作成した各 Playwright testは、Vegas のローカルbrowser harnessを使用します。harnessは次の処理を行います。

1. 選択した Vegas プロジェクトを読み込みます。
2. development モードでサーバープログラムをビルドします。
3. inline Runtime Data fixtureから新しい Local Runtime を作成します。
4. 一時的なportでローカルhost serverとuser-content serverを起動します。
5. Playwright の `page` でhost applicationを開きます。
6. user HTML frameのinject完了を待ってから `vegas.app` を公開します。

`google.script.run` を使うクライアント呼び出しはローカルbrowser bridgeを通過し、そのテストの Local Runtime で実行されます。

通常のdevelopmentでプロジェクトがGoogleバックエンドを使う設定になっていても、Playwright アダプターはサーバー関数呼び出しを Google Apps Script バックエンドへルーティングしません。browser testは Local Runtime testです。

## Host Page と Application Locator

テスト API では Playwright の標準fixtureもそのまま利用できます。特に、`page` は外側の Vegas host pageを指し、`vegas.app` はネストしたuser-content frame内に描画されたuser applicationを指します。

```typescript
const test = createBrowserTest();

test("can inspect the host and the application", async ({ page, vegas }) => {
  expect(new URL(page.url()).pathname).toBe("/dev");
  await expect(vegas.app.locator("main")).toBeVisible();
});
```

通常のアプリケーション操作には `vegas.app` を使用してください。host levelのnavigation、request API、user HTML documentの外側にあるPlaywright機能が必要な場合は `page` を使用します。

## Vegas プロジェクトを選択する

既定では、`createBrowserTest()` は現在の作業ディレクトリから Vegas プロジェクトを読み込みます。

別の Vegas プロジェクトルートを使う場合は `root` を指定します。

```typescript
const test = createBrowserTest({
  root: "./examples/app",
});
```

選択したプロジェクトが、browser harnessで使用するローカル Web アプリとサーバープログラムを提供します。

## Runtime Data をseedする

テスト用の Local Runtime stateは `runtimeData` オプションで指定します。

```typescript
import { createBrowserTest, type RuntimeDataFixture } from "@vegasjs/vegas/playwright";

const runtimeData = {
  properties: {
    scriptProperties: {
      environment: "browser-test",
    },
  },
  session: {
    activeUserEmail: "tester@example.com",
  },
} satisfies RuntimeDataFixture;

const test = createBrowserTest({ runtimeData });
```

inline fixture は Vitest アダプターや Local Runtime の snapshot model と同じ、検証済みの Properties・Session・Spreadsheet のデータ構造を使用します。

Playwright アダプターは、プロジェクトの `runtime/` ディレクトリからmoduleを**自動では読み込みません**。browser testのstateは `runtimeData` で明示的に渡してください。

## テストの分離

各テストには、新しいbrowser harness、Local Runtime、Runtime session、インメモリstore、一時的なローカルserverが作成されます。テスト終了後にharnessは破棄されます。

そのため Runtime の変更が、次のbrowser testの開始stateになることはありません。

```typescript
const test = createBrowserTest({
  runtimeData: {
    properties: {
      scriptProperties: {
        prefix: "Vegas",
      },
    },
  },
});

test("can mutate runtime state", async ({ vegas }) => {
  await vegas.app.getByRole("button", { name: "Change prefix" }).click();
  await expect(vegas.app.locator("#result")).toHaveText("Changed");
});

test("starts from the fixture again", async ({ vegas }) => {
  await expect(vegas.app.locator("#result")).toHaveText("Vegas");
});
```

この分離はtest scopeです。Local Runtime の変更を Runtime Data ファイルへ永続化することはありません。

## Cross-Origin Web App Model

browser harnessは Vegas hostとuser-content applicationを別々の一時originで実行します。user HTMLは、ローカル Web app developmentと同じcross-origin iframeとmessage bridgeのmodel内に置かれます。

そのため Playwright アダプターは、サーバーだけのテストでは扱えない次のような挙動に適しています。

- browserの描画と操作
- クライアントからサーバーへの `google.script.run` 呼び出し
- Vegas browser bridge
- iframeとcross-originの統合挙動
- Playwright の `page` やrequest APIと組み合わせたhost levelのHTTP挙動

一時的に割り当てられる具体的なport番号は、意図的にテスト契約の一部としていません。

## Playwright の Assertion

`@vegasjs/vegas/playwright` は Playwright の `expect` をre-exportするため、テストアダプターとbrowser assertionを同じentrypointからimportできます。

```typescript
import { createBrowserTest, expect } from "@vegasjs/vegas/playwright";
```

その他の Playwright API は通常どおり `@playwright/test` からimportできます。

## Vitest と Playwright の使い分け

Local Runtime でサーバー関数を直接実行するだけで確認できる挙動には [Vitest](./vitest) を使用してください。browserやローカル Web serverを起動せずにテストできます。

browser application、`google.script.run`、Web app bridge、cross-origin framing、host levelのHTTP挙動に依存する場合は Playwright を使用してください。

どちらのアダプターも明示的なinline Runtime Dataを使用し、テストごとに分離された Local Runtime stateを作成します。Runtime Data の意味と Runtime の挙動方針については [Local Runtime](./local-runtime) を参照してください。
