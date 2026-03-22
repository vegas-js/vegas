import fs from "node:fs";
import path from "node:path";

import { Rolldown } from "tsdown";

export default function rolldownLicensePlugin(
  root: string,
  AdditionalLicenseFiles: string[] = [],
): Rolldown.Plugin {
  return {
    name: "rolldown-license-plugin",

    generateBundle(_, bundle) {
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

      const licenseSet: Set<string> = new Set();
      packages.forEach((pkgName, index) => {
        outputLicenses.push(`## ${pkgName}`);
        const pkgPath = packageMap.get(pkgName)!;
        const pkgRootPath = path.join(pkgPath, pkgName);
        const packageJsonPath = path.join(pkgRootPath, "package.json");
        const packageJsonText = fs.readFileSync(packageJsonPath, { encoding: "utf8" });
        const packageJson = JSON.parse(packageJsonText);
        if (packageJson.license !== undefined) {
          outputLicenses.push(`License: ${packageJson.license}`);
          licenseSet.add(packageJson.license);
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
        const licenseText = fs.readFileSync(readPath, { encoding: "utf8" });
        outputLicenses.push(licenseText.replace(/^/gm, "> ").replace(/\n> $/g, ""));
        if (index !== packages.length - 1) {
          outputLicenses.push("\n---------------------------------------\n");
        }
      });

      const coreLicensePath = path.join(process.cwd(), "LICENSE");
      const coreLicenseText = fs.readFileSync(coreLicensePath, { encoding: "utf8" });
      const licenseHeader: string[] = [
        "# Vegas core license",
        "Vegas is released under the MIT license:\n",
        coreLicenseText,
      ];
      if (AdditionalLicenseFiles.length > 0) {
        AdditionalLicenseFiles.forEach((licenseFile) => {
          const filePath = path.join(root, licenseFile);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, { encoding: "utf8" });
            licenseHeader.push(content);
          }
        });
      }

      licenseHeader.push(
        "# Licenses of bundled dependencies",
        "The published Vegas artifact additionally contains code with the following licenses:",
        Array.from(licenseSet).sort().join(", "),
        "",
      );

      licenseHeader.reverse().forEach((line) => {
        outputLicenses.unshift(line);
      });

      fs.writeFileSync(path.join(root, "LICENSE.md"), `${outputLicenses.join("\n")}\n`, {
        encoding: "utf8",
      });
    },
  };
}
