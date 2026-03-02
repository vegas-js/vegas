import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: {
      vegas: "./src/cli",
      gas: "./src/worker/gas",
      fetch: "./src/worker/fetch",
      client: "./src/client",
    },
    external: ["vite"],
    inlineOnly: ["@rolldown/pluginutils", "cac", "entities", "parse5", "rolldown"],
    outputOptions: {
      entryFileNames: "[name].js",
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
]);
