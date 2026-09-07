import path from "node:path";

import { defineConfig } from "tsdown";

import pkg from "./package.json" with { type: "json" };
import rolldownLicensePlugin from "./rolldownLicensePlugin.ts";

export default defineConfig([
  {
    entry: {
      vegas: "./src/node/cli",
      worker: "./src/node/worker",
      browser: "./src/browser",
    },
    define: {
      __PACKAGE_NAME__: JSON.stringify(path.basename(pkg.name)),
      __PACKAGE_VERSION__: JSON.stringify(pkg.version),
    },
    deps: {
      onlyBundle: ["@platformatic/vfs", "cac", "entities", "parse5"],
    },
    outputOptions: {
      entryFileNames: "[name].js",
      chunkFileNames: "chunks/[name].js",
    },
    dts: false,
    plugins: [rolldownLicensePlugin(import.meta.dirname)],
  },
  {
    entry: "./src/node/lib",
    outputOptions: {
      entryFileNames: (chunk) => `${chunk.name.replace(/^index(\.d)?$/, "lib$1")}.js`,
    },
    dts: {
      compilerOptions: { isolatedDeclarations: true },
    },
  },
]);
