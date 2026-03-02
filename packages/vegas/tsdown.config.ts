import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: {
      vegas: "./src/cli",
      gas: "./src/worker/gas",
      fetch: "./src/worker/fetch",
      client: "./src/client",
    },
    inlineOnly: ["cac", "entities", "parse5"],
    outputOptions: {
      entryFileNames: "[name].js",
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
