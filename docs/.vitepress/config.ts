import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Vegas",
  description: "Vite-powered development and build tool for Google Apps Script",
  head: [["link", { rel: "icon", href: "/favicon.ico" }]],
  locales: {
    root: {
      label: "English",
      lang: "en",
      themeConfig: {
        nav: [
          { text: "Guide", link: "/guide" },
          {
            text: "Runtime",
            items: [
              { text: "Runtime Architecture", link: "/guide/runtime-architecture/" },
              { text: "Local Runtime", link: "/guide/local-runtime/" },
              {
                text: "Google Apps Script Runtime",
                link: "/guide/google-apps-script-runtime/",
              },
            ],
          },
          {
            text: "Testing",
            items: [
              { text: "Vitest", link: "/guide/vitest/" },
              { text: "Playwright", link: "/guide/playwright/" },
            ],
          },
          {
            text: "Reference",
            items: [
              { text: "JavaScript API", link: "/guide/api-javascript/" },
              { text: "Runtime API coverage", link: "/guide/runtime-api-coverage/" },
            ],
          },
          { text: "Config", link: "/config" },
        ],

        sidebar: {
          "/guide/": [
            {
              text: "Introduction",
              items: [
                { text: "Getting Started", link: "/guide/" },
                { text: "Command Line Interface", link: "/guide/cli/" },
                { text: "Project Structure", link: "/guide/project-structure/" },
                { text: "Development and Build", link: "/guide/development-and-build/" },
              ],
            },
            {
              text: "Runtime",
              items: [
                { text: "Runtime Architecture", link: "/guide/runtime-architecture/" },
                { text: "Local Runtime", link: "/guide/local-runtime/" },
                {
                  text: "Google Apps Script Runtime",
                  link: "/guide/google-apps-script-runtime/",
                },
              ],
            },
            {
              text: "Testing",
              items: [
                { text: "Vitest", link: "/guide/vitest/" },
                { text: "Playwright", link: "/guide/playwright/" },
              ],
            },
            {
              text: "Data",
              items: [{ text: "Spreadsheet Data", link: "/guide/spreadsheet-data/" }],
            },
            {
              text: "Reference",
              items: [
                { text: "JavaScript API", link: "/guide/api-javascript/" },
                { text: "Runtime API coverage", link: "/guide/runtime-api-coverage/" },
              ],
            },
            {
              text: "About",
              items: [
                { text: "Why Vegas", link: "/guide/why/" },
                { text: "Philosophy", link: "/guide/philosophy/" },
              ],
            },
          ],
          "/config/": [
            {
              text: "Config",
              items: [
                { text: "Configuring Vegas", link: "/config/" },
                { text: "Shared Options", link: "/config/shared-options/" },
              ],
            },
          ],
        },

        footer: {
          message: "Released under the MIT License.",
          copyright: "&copy; Yasushi 2026",
        },
      },
    },
    ja: {
      label: "日本語",
      lang: "ja",
      description: "Google Apps Script に特化した Vite ベースの開発・ビルドツール",
      themeConfig: {
        nav: [
          { text: "ガイド", link: "/ja/guide" },
          {
            text: "Runtime",
            items: [
              { text: "Runtime アーキテクチャ", link: "/ja/guide/runtime-architecture/" },
              { text: "Local Runtime", link: "/ja/guide/local-runtime/" },
              {
                text: "Google Apps Script Runtime",
                link: "/ja/guide/google-apps-script-runtime/",
              },
            ],
          },
          {
            text: "テスト",
            items: [
              { text: "Vitest", link: "/ja/guide/vitest/" },
              { text: "Playwright", link: "/ja/guide/playwright/" },
            ],
          },
          {
            text: "リファレンス",
            items: [
              { text: "JavaScript API", link: "/ja/guide/api-javascript/" },
              { text: "Runtime API coverage", link: "/ja/guide/runtime-api-coverage/" },
            ],
          },
          { text: "設定", link: "/ja/config" },
        ],

        sidebar: {
          "/ja/guide/": [
            {
              text: "はじめに",
              items: [
                { text: "はじめに", link: "/ja/guide/" },
                { text: "コマンドラインインターフェース", link: "/ja/guide/cli/" },
                { text: "プロジェクト構成", link: "/ja/guide/project-structure/" },
                { text: "開発とビルド", link: "/ja/guide/development-and-build/" },
              ],
            },
            {
              text: "Runtime",
              items: [
                { text: "Runtime アーキテクチャ", link: "/ja/guide/runtime-architecture/" },
                { text: "Local Runtime", link: "/ja/guide/local-runtime/" },
                {
                  text: "Google Apps Script Runtime",
                  link: "/ja/guide/google-apps-script-runtime/",
                },
              ],
            },
            {
              text: "テスト",
              items: [
                { text: "Vitest", link: "/ja/guide/vitest/" },
                { text: "Playwright", link: "/ja/guide/playwright/" },
              ],
            },
            {
              text: "データ",
              items: [{ text: "Spreadsheet Data", link: "/ja/guide/spreadsheet-data/" }],
            },
            {
              text: "リファレンス",
              items: [
                { text: "JavaScript API", link: "/ja/guide/api-javascript/" },
                { text: "Runtime API coverage", link: "/ja/guide/runtime-api-coverage/" },
              ],
            },
            {
              text: "Vegas について",
              items: [
                { text: "Why Vegas", link: "/ja/guide/why/" },
                { text: "プロジェクトの思想", link: "/ja/guide/philosophy/" },
              ],
            },
          ],
          "/ja/config/": [
            {
              text: "設定",
              items: [
                { text: "Vegas の設定", link: "/ja/config/" },
                { text: "共有オプション", link: "/ja/config/shared-options/" },
              ],
            },
          ],
        },

        outline: {
          label: "このページの内容",
        },
        docFooter: {
          prev: "前のページ",
          next: "次のページ",
        },
        darkModeSwitchLabel: "テーマ",
        lightModeSwitchTitle: "ライトモードに切り替える",
        darkModeSwitchTitle: "ダークモードに切り替える",
        sidebarMenuLabel: "メニュー",
        returnToTopLabel: "トップへ戻る",
        langMenuLabel: "言語を変更",
        skipToContentLabel: "コンテンツへ移動",

        footer: {
          message: "MIT License で公開されています。",
          copyright: "&copy; Yasushi 2026",
        },
      },
    },
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/logo.webp",

    search: {
      provider: "local",
      options: {
        locales: {
          ja: {
            translations: {
              button: {
                buttonText: "検索",
                buttonAriaLabel: "検索",
              },
              modal: {
                displayDetails: "詳細一覧を表示",
                resetButtonTitle: "検索をリセット",
                backButtonTitle: "検索を閉じる",
                noResultsText: "結果が見つかりません",
                footer: {
                  selectText: "選択",
                  selectKeyAriaLabel: "Enter",
                  navigateText: "移動",
                  navigateUpKeyAriaLabel: "上矢印",
                  navigateDownKeyAriaLabel: "下矢印",
                  closeText: "閉じる",
                  closeKeyAriaLabel: "Esc",
                },
              },
            },
          },
        },
      },
    },

    socialLinks: [{ icon: "github", link: "https://github.com/vegas-js/vegas" }],
  },
});
