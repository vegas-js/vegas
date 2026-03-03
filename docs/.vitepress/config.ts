import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Vegas",
  description: "A VitePress Site",
  head: [["link", { rel: "icon", href: "/favicon.ico" }]],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/vegas.webp",

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
            { text: "Features", link: "/guide/" },
            { text: "CLI", link: "/guide/philosophy/" },
            { text: "Using Plugins", link: "/guide/why/" },
          ],
        },
      ],
      "/config/": [
        {
          text: "Config",
          items: [
            { text: "Configuring Vegas", link: "/config/" },
            { text: "Shared Options", link: "/config/shared-options/" },
            { text: "Server Options", link: "/config/server-options/" },
            { text: "Build Options", link: "/config/build-options/" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/vegas-js/vegas" }],

    footer: {
      copyright: "&copy; Yasushi 2026",
    },
  },
});
