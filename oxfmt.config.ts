import { defineConfig } from "oxfmt";

export default defineConfig({
  experimentalSortImports: {},
  experimentalSortPackageJson: {},
  ignorePatterns: ["**/LICENSE*", "packages/create-vegas/template-*"],
});
