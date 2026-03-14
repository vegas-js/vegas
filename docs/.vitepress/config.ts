import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Vegas",
  description: "SPA build tool for GAS platform",
  head: [["link", { rel: "icon", href: "/favicon.ico" }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/logo.webp",

    nav: [
      { text: "Guide", link: "/guide" },
      { text: "Config", link: "/config" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/" },
            { text: "Philosophy", link: "/guide/philosophy/" },
            { text: "Why Vegas", link: "/guide/why/" },
          ],
        },
        {
          text: "Guide",
          items: [
            { text: "Features", link: "/guide/features/" },
            { text: "CLI", link: "/guide/cli/" },
            { text: "Using Plugins", link: "/guide/using-plugins/" },
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

    socialLinks: [{ icon: "github", link: "https://github.com/vegas-js/vegas" }],

    footer: {
      message: "Released under the MIT License.",
      copyright: "&copy; Yasushi 2026",
    },
  },
});
