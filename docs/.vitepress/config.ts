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
    ko: {
      label: "한국어",
      lang: "ko",
      description: "Google Apps Script에 특화된 Vite 기반 개발 및 빌드 도구",
      themeConfig: {
        nav: [
          { text: "가이드", link: "/ko/guide" },
          {
            text: "Runtime",
            items: [
              { text: "Runtime 아키텍처", link: "/ko/guide/runtime-architecture/" },
              { text: "Local Runtime", link: "/ko/guide/local-runtime/" },
              {
                text: "Google Apps Script Runtime",
                link: "/ko/guide/google-apps-script-runtime/",
              },
            ],
          },
          {
            text: "테스트",
            items: [
              { text: "Vitest", link: "/ko/guide/vitest/" },
              { text: "Playwright", link: "/ko/guide/playwright/" },
            ],
          },
          {
            text: "레퍼런스",
            items: [
              { text: "JavaScript API", link: "/ko/guide/api-javascript/" },
              { text: "Runtime API coverage", link: "/ko/guide/runtime-api-coverage/" },
            ],
          },
          { text: "설정", link: "/ko/config" },
        ],

        sidebar: {
          "/ko/guide/": [
            {
              text: "시작하기",
              items: [
                { text: "시작하기", link: "/ko/guide/" },
                { text: "명령줄 인터페이스", link: "/ko/guide/cli/" },
                { text: "프로젝트 구조", link: "/ko/guide/project-structure/" },
                { text: "개발과 빌드", link: "/ko/guide/development-and-build/" },
              ],
            },
            {
              text: "Runtime",
              items: [
                { text: "Runtime 아키텍처", link: "/ko/guide/runtime-architecture/" },
                { text: "Local Runtime", link: "/ko/guide/local-runtime/" },
                {
                  text: "Google Apps Script Runtime",
                  link: "/ko/guide/google-apps-script-runtime/",
                },
              ],
            },
            {
              text: "테스트",
              items: [
                { text: "Vitest", link: "/ko/guide/vitest/" },
                { text: "Playwright", link: "/ko/guide/playwright/" },
              ],
            },
            {
              text: "데이터",
              items: [{ text: "Spreadsheet Data", link: "/ko/guide/spreadsheet-data/" }],
            },
            {
              text: "레퍼런스",
              items: [
                { text: "JavaScript API", link: "/ko/guide/api-javascript/" },
                { text: "Runtime API coverage", link: "/ko/guide/runtime-api-coverage/" },
              ],
            },
            {
              text: "Vegas 소개",
              items: [
                { text: "Why Vegas", link: "/ko/guide/why/" },
                { text: "프로젝트 철학", link: "/ko/guide/philosophy/" },
              ],
            },
          ],
          "/ko/config/": [
            {
              text: "설정",
              items: [
                { text: "Vegas 설정", link: "/ko/config/" },
                { text: "공통 옵션", link: "/ko/config/shared-options/" },
              ],
            },
          ],
        },

        outline: {
          label: "이 페이지의 내용",
        },
        docFooter: {
          prev: "이전 페이지",
          next: "다음 페이지",
        },
        darkModeSwitchLabel: "테마",
        lightModeSwitchTitle: "라이트 모드로 전환",
        darkModeSwitchTitle: "다크 모드로 전환",
        sidebarMenuLabel: "메뉴",
        returnToTopLabel: "맨 위로 돌아가기",
        langMenuLabel: "언어 변경",
        skipToContentLabel: "콘텐츠로 이동",

        footer: {
          message: "MIT License로 공개됩니다.",
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
          ko: {
            translations: {
              button: {
                buttonText: "검색",
                buttonAriaLabel: "검색",
              },
              modal: {
                displayDetails: "상세 목록 표시",
                resetButtonTitle: "검색 초기화",
                backButtonTitle: "검색 닫기",
                noResultsText: "검색 결과가 없습니다",
                footer: {
                  selectText: "선택",
                  selectKeyAriaLabel: "Enter",
                  navigateText: "이동",
                  navigateUpKeyAriaLabel: "위쪽 화살표",
                  navigateDownKeyAriaLabel: "아래쪽 화살표",
                  closeText: "닫기",
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
