import { defineConfig } from "tsdown";

export default defineConfig([
  {
    external: ["vite"],
    inlineOnly: ["@rolldown/pluginutils", "cac", "rolldown"],
    outputOptions: {
      entryFileNames: "vegas.js",
      chunkFileNames: "chunks/[name].js",
    },
    dts: false,
  },
  {
    entry: "./src/lib.ts",
    external: ["vite"],
    outputOptions: {
      entryFileNames: "[name].js",
    },
    dts: {
      compilerOptions: { isolatedDeclarations: true },
    },
  },
]);
