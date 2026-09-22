import { defineConfig } from "tsdown";

import rolldownLicensePlugin from "./rolldown-license-plugin.ts";

export default defineConfig([
  {
    entry: {
      vegas: "./src/node/cli",
      worker: "./src/node/worker",
      "webapp-bridge": "./src/client",
    },
    deps: {
      onlyBundle: ["cac", "entities", "json5", "parse5", "zod"],
    },
    fixedExtension: false,
    dts: false,
    plugins: [rolldownLicensePlugin(import.meta.dirname)],
  },
  {
    entry: {
      config: "./src/lib/config",
      client: "./src/lib/client",
    },
    fixedExtension: false,
    dts: {
      compilerOptions: { isolatedDeclarations: true },
    },
    attw: true,
  },
  {
    entry: {
      vitest: "./src/lib/vitest",
    },
    deps: {
      onlyBundle: ["entities", "parse5", "zod"],
    },
    tsconfig: "./tsconfig.node.json",
    fixedExtension: false,
    dts: true,
    attw: true,
  },
]);
