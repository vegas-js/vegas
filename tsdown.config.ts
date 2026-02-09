import { defineConfig } from "tsdown";

export default defineConfig({
  outputOptions: {
    entryFileNames: "vegas.js",
  },
  dts: false,
});
