import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fsModuleCache: true,
    coverage: {
      include: ["packages/*/src/**/*.ts"],
      reporter: "text",
    },
  },
});
