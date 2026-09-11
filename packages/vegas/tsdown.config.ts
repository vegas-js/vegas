import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: "src/index.ts",
    attw: {
      profile: "esm-only",
    },
    dts: {
      compilerOptions: {
        isolatedDeclarations: true,
      },
    },
    fixedExtension: false,
  },
  {
    entry: "src/cli.ts",
    fixedExtension: false,
    dts: false,
  },
]);
