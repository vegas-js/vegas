import { defineConfig } from "tsdown";

import rolldownLicensePlugin from "../../tooling/rolldown-license-plugin.ts";

export default defineConfig([
  {
    entry: {
      vegas: "./src/node/cli",
      worker: "./src/node/worker",
    },
    deps: {
      onlyBundle: ["cac", "entities", "json5", "parse5", "zod"],
    },
    tsconfig: "./tsconfig.node.json",
    fixedExtension: false,
    dts: false,
    plugins: [rolldownLicensePlugin(import.meta.dirname)],
  },
  {
    entry: {
      "webapp-bridge": "./src/webapp-bridge",
    },
    tsconfig: "./tsconfig.client.json",
    fixedExtension: false,
    dts: false,
  },
  {
    entry: {
      config: "./src/entrypoints/config",
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
      client: "./src/entrypoints/client",
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
      server: "./src/entrypoints/server",
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
      playwright: "./src/entrypoints/playwright",
      vitest: "./src/entrypoints/vitest",
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
