import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fsModuleCache: true,
    isolate: false,
    coverage: {
      include: ["packages/*/src/**/*.ts"],
      reporter: "text",
    },
  },
});
