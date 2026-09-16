import { defineConfig } from "tsdown";

import rolldownLicensePlugin from "./rolldown-license-plugin.ts";

export default defineConfig([
  {
    entry: {
      vegas: "./src/node/cli",
      worker: "./src/node/worker",
      client: "./src/client",
    },
    deps: {
      onlyBundle: ["cac", "entities", "json5", "parse5"],
    },
    fixedExtension: false,
    dts: false,
    plugins: [rolldownLicensePlugin(import.meta.dirname)],
  },
  {
    entry: {
      lib: "./src/lib",
      config: "./src/lib/config",
    },
    fixedExtension: false,
    dts: {
      compilerOptions: { isolatedDeclarations: true },
    },
    attw: true,
  },
]);
