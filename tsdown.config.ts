import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: "./src/cli/index.ts",
    external: ["vite"],
    inlineOnly: ["@rolldown/pluginutils", "cac", "entities", "parse5", "rolldown"],
    outputOptions: {
      entryFileNames: "vegas.js",
      chunkFileNames: "chunks/[name].js",
    },
    dts: false,
  },
  {
    entry: "./src/lib/index.ts",
    external: ["vite"],
    outputOptions: {
      entryFileNames: (chunk) => `${chunk.name.replace(/^index(\.d)?$/, "lib$1")}.js`,
    },
    dts: {
      compilerOptions: { isolatedDeclarations: true },
    },
  },
  {
    entry: "./src/worker/index.ts",
    outputOptions: {
      entryFileNames: "worker.js",
    },
    dts: false,
  },
]);
