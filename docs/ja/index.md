---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: Vegas
  text: The Build Tool for the Google Apps Script
  tagline: "Vegas は Google Apps Script に特化した、<br>Vite ベースの開発・ビルドツールです。"
  image:
    src: /logo.webp
    alt: Vegas
  actions:
    - theme: brand
      text: はじめる
      link: /ja/guide
    - theme: alt
      text: GitHub で見る
      link: https://github.com/vegas-js/vegas

features:
  - title: 高速なローカル開発
    details: 編集のたびにリモート実行へ依存することなく、Vite ベースの開発ワークフローを Apps Script プロジェクトで利用できます。
  - title: Apps Script に特化したビルド
    details: 複数の独立したフロントエンドエントリを含め、Apps Script の制約に合わせてクライアントコードとサーバーコードをビルドします。
  - title: 明示的な Local Runtime
    details: 対応している Apps Script API を、挙動の分類・制約・契約ベースの検証方針を明示したローカル環境で実行できます。
---

::: warning 注意

Vegas は **Google LLC** および **VoidZero Inc.** とは提携していない独立したプロジェクトです。

:::

::: code-group

```sh [npm]
$ npm create vegas@latest
```

```sh [pnpm]
$ pnpm create vegas
```

:::
