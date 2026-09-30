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
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/logo.webp",

    search: { provider: "local" },

    socialLinks: [{ icon: "github", link: "https://github.com/vegas-js/vegas" }],
  },
});
