import { defineConfig } from "tsdown";

import rolldownLicensePlugin from "../../tooling/rolldown-license-plugin.ts";

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
    },
    tsconfig: "./tsconfig.node.json",
    fixedExtension: false,
    dts: {
      compilerOptions: { isolatedDeclarations: true },
    },
    attw: true,
  },
  {
    entry: {
      client: "./src/lib/client",
    },
    tsconfig: "./tsconfig.client.json",
    fixedExtension: false,
    dts: {
      compilerOptions: { isolatedDeclarations: true },
    },
    attw: true,
  },
  {
    entry: {
      server: "./src/lib/server",
    },
    tsconfig: "./tsconfig.server.json",
    fixedExtension: false,
    dts: {
      compilerOptions: { isolatedDeclarations: true },
    },
    attw: true,
  },
  {
    entry: {
      playwright: "./src/lib/playwright",
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
