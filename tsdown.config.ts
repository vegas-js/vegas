import { defineConfig } from "tsdown";

export default defineConfig({
  inlineOnly: ["cac"],
  outputOptions: {
    entryFileNames: "vegas.js",
  },
  dts: false,
});
