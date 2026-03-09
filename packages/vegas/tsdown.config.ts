import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: {
      vegas: "./src/node/cli",
      gas: "./src/node/worker/gas",
      fetch: "./src/node/worker/fetch",
      client: "./src/client",
    },
    deps: {
      onlyAllowBundle: ["cac", "entities", "parse5"],
    },
    outputOptions: {
      entryFileNames: "[name].js",
      chunkFileNames: "chunks/[name].js",
    },
    dts: false,
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
