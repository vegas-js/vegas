import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: "./src/cli/index",
    external: ["vite"],
    inlineOnly: ["@rolldown/pluginutils", "cac", "entities", "parse5", "rolldown"],
    outputOptions: {
      entryFileNames: "vegas.js",
      chunkFileNames: "chunks/[name].js",
    },
    dts: false,
  },
  {
    entry: "./src/lib/index",
    external: ["vite"],
    outputOptions: {
      entryFileNames: (chunk) => `${chunk.name.replace(/^index(\.d)?$/, "lib$1")}.js`,
    },
    dts: {
      compilerOptions: { isolatedDeclarations: true },
    },
  },
  {
    entry: ["./src/worker/gas", "./src/worker/fetch"],
    inlineOnly: ["entities", "parse5"],
    outputOptions: {
      entryFileNames: "[name].js",
    },
    dts: false,
  },
  {
    entry: "./src/client",
    outputOptions: {
      entryFileNames: "[name].js",
    },
    dts: false,
  },
]);
