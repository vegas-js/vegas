import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { "create-vegas": "./src" },
  deps: {
    onlyAllowBundle: [
      "cac",
      "@clack/core",
      "@clack/prompts",
      "cross-spawn",
      "isexe",
      "path-key",
      "picocolors",
      "shebang-command",
      "shebang-regex",
      "sisteransi",
      "which",
    ],
  },
  outputOptions: {
    entryFileNames: "[name].js",
  },
  dts: false,
  plugins: [
    {
      name: "vite-license-plugin",

      async generateBundle(_, bundle) {
        const packageSet: Set<string> = new Set();
        const packageMap: Map<string, string> = new Map();
        const nodeModuleDirName = "/node_modules/";
        Object.keys(bundle).forEach((key) => {
          const output = bundle[key];
          if (output.type === "chunk") {
            output.moduleIds
              .filter((moduleId) => moduleId.includes(nodeModuleDirName))
              .map((moduleId) => {
                const nodeModuleIndex = moduleId.lastIndexOf(nodeModuleDirName);
                const modulePath = moduleId.slice(0, nodeModuleIndex + nodeModuleDirName.length);
                const moduleInnerPath = moduleId.slice(nodeModuleIndex + nodeModuleDirName.length);
                const splittedModuleInnerPath = moduleInnerPath.split("/");
                const packageName = splittedModuleInnerPath[0].startsWith("@")
                  ? splittedModuleInnerPath.slice(0, 2).join("/")
                  : splittedModuleInnerPath[0];
                if (!packageMap.has(packageName)) {
                  packageSet.add(packageName);
                  packageMap.set(packageName, modulePath);
                }
              });
          }
        });

        const packages = Array.from(packageSet).sort();
        const outputLicenses: string[] = [
          "# Bundled Third-Party Licenses",
          "This file contains licenses of third-party libraries bundled in this package.\n",
        ];

        packages.forEach((pkgName, index) => {
          outputLicenses.push(`## ${pkgName}`);
          const pkgPath = packageMap.get(pkgName)!;
          const pkgRootPath = path.join(pkgPath, pkgName);
          const packageJson = JSON.parse(
            fs.readFileSync(path.join(pkgRootPath, "package.json"), { encoding: "utf8" }),
          );
          if (packageJson.license !== undefined) {
            outputLicenses.push(`License: ${packageJson.license}`);
          }
          if (packageJson.author !== undefined) {
            if (typeof packageJson.author === "object") {
              const author: string[] = [packageJson.author.name];
              if (packageJson.author.email) {
                author.push(`<${packageJson.author.email}>`);
              }
              if (packageJson.author.url) {
                author.push(`(${packageJson.author.url})`);
              }

              outputLicenses.push(`By: ${author.join(" ")}`);
            } else {
              outputLicenses.push(`By: ${packageJson.author}`);
            }
          }
          if (packageJson.repository !== undefined && packageJson.repository.url !== undefined) {
            outputLicenses.push(`Repositories: ${packageJson.repository.url}`);
          }
          outputLicenses.push("");
          const upperLicenseFileName = "LICENSE";
          const lowerLicenseFileName = upperLicenseFileName.toLowerCase();
          let readPath = "";
          if (fs.existsSync(path.join(pkgRootPath, upperLicenseFileName))) {
            readPath = path.join(pkgRootPath, upperLicenseFileName);
          } else if (fs.existsSync(path.join(pkgRootPath, lowerLicenseFileName))) {
            readPath = path.join(pkgRootPath, lowerLicenseFileName);
          }
          outputLicenses.push(fs.readFileSync(readPath, { encoding: "utf8" }).replace(/^/gm, "> "));
          if (index !== packages.length - 1) {
            outputLicenses.push("\n---------------------------------------\n");
          }
        });

        await this.fs.writeFile(
          path.join(import.meta.dirname, "LICENSES_BUNDLED.md"),
          outputLicenses.join("\n"),
          { encoding: "utf8" },
        );
      },
    },
  ],
});
