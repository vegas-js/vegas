import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: "./src",
    inlineOnly: ["cac", "@clack/core", "@clack/prompts", "picocolors", "sisteransi"],
    outputOptions: {
      entryFileNames: "create-vegas.js",
    },
    dts: false,
  },
]);
