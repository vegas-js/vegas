import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: "src/index.ts",
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
  },
]);
