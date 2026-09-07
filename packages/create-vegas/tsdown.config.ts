import path from "node:path";

import { defineConfig } from "tsdown";

import rolldownLicensePlugin from "../vegas/rolldownLicensePlugin.ts";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  entry: { "create-vegas": "./src" },
  define: {
    __PACKAGE_NAME__: JSON.stringify(path.basename(pkg.name)),
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
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
