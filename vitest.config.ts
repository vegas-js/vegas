import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fsModuleCache: true,
    reporters: process.env.GITHUB_ACTIONS === "true" ? undefined : ["dot"],
    coverage: {
      include: ["packages/*/src/**/*.ts"],
      reporter: "text",
    },
  },
});
