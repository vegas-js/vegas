import path from "node:path";

import { defineConfig } from "tsdown";

import pkg from "./package.json";
import rolldownLicensePlugin from "./rolldownLicensePlugin";

export default defineConfig([
  {
    entry: {
      vegas: "./src/node/cli",
      worker: "./src/node/worker",
      client: "./src/client",
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
    entry: "./src/lib",
    outputOptions: {
      entryFileNames: (chunk) => `${chunk.name.replace(/^index(\.d)?$/, "lib$1")}.js`,
    },
    dts: {
      compilerOptions: { isolatedDeclarations: true },
    },
  },
]);
