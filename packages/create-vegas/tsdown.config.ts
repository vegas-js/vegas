import { defineConfig } from "tsdown";

import rolldownLicensePlugin from "../vegas/rolldownLicensePlugin";

export default defineConfig({
  entry: { "create-vegas": "./src" },
  deps: {
    onlyBundle: [
      "@clack/core",
      "@clack/prompts",
      "cac",
      "cross-spawn",
      "fast-string-truncated-width",
      "fast-string-width",
      "fast-wrap-ansi",
      "isexe",
      "path-key",
      "shebang-command",
      "shebang-regex",
      "sisteransi",
      "which",
    ],
  },
  outputOptions: {
    entryFileNames: "[name].js",
  },
  dts: false,
  plugins: [rolldownLicensePlugin(import.meta.dirname, ["LICENSE-TEMPLATES"])],
});
