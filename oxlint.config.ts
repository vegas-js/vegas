import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["eslint", "import", "jsdoc", "node", "oxc", "promise", "typescript", "unicorn"],
  ignorePatterns: ["packages/create-vegas/template-*", "packages/vegas/client.d.ts"],
  options: {
    // "denyWarnings": true,
    typeAware: true,
    typeCheck: true,
  },
});
