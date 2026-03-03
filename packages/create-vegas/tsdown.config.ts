import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { "create-vegas": "./src" },
  inlineOnly: [
    "cac",
    "@clack/core",
    "@clack/prompts",
    "cross-spawn",
    "isexe",
    "path-key",
    "picocolors",
    "shebang-command",
    "shebang-regex",
    "sisteransi",
    "which",
  ],
  outputOptions: {
    entryFileNames: "[name].js",
  },
  dts: false,
});
