import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Vegas",
  description: "Vite-powered development and build tool for Google Apps Script",
  head: [["link", { rel: "icon", href: "/favicon.ico" }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/logo.webp",

    nav: [
      { text: "Guide", link: "/guide" },
      { text: "Local Runtime", link: "/guide/local-runtime/" },
      { text: "Config", link: "/config" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/" },
            { text: "Why Vegas", link: "/guide/why/" },
            { text: "Philosophy", link: "/guide/philosophy/" },
          ],
        },
        {
          text: "Development",
          items: [{ text: "Local Runtime", link: "/guide/local-runtime/" }],
        },
        {
          text: "Reference",
          items: [
            { text: "JavaScript API", link: "/guide/api-javascript/" },
            { text: "Runtime API coverage", link: "/guide/runtime-api-coverage/" },
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

    search: { provider: "local" },

    socialLinks: [{ icon: "github", link: "https://github.com/vegas-js/vegas" }],

    footer: {
      message: "Released under the MIT License.",
      copyright: "&copy; Yasushi 2026",
    },
  },
});
