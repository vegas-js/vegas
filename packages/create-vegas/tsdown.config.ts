import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { "create-vegas": "./src" },
  inlineOnly: ["cac", "@clack/core", "@clack/prompts", "picocolors", "sisteransi"],
  outputOptions: {
    entryFileNames: "[name].js",
  },
  dts: false,
});
