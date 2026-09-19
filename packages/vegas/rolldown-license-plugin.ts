import fs from "node:fs";
import path from "node:path";

import { Rolldown } from "tsdown";

const PREFERRED_LICENSE_FILE_NAMES = ["LICENSE", "LICENSE.md", "license"] as const;
const LICENSE_FILE_NAME_PATTERN = /^(?:licen[cs]e|copying)(?:[._-].*)?$/i;
const NOTICE_FILE_NAME_PATTERN = /^notice(?:[._-].*)?$/i;
const NODE_MODULES_SEGMENT = "/node_modules/";

export interface BundledPackage {
  readonly name: string;
  readonly root: string;
}

export function resolveBundledPackage(moduleId: string): BundledPackage | null {
  const normalizedModuleId = moduleId.replaceAll("\\", "/");
  const nodeModulesIndex = normalizedModuleId.lastIndexOf(NODE_MODULES_SEGMENT);

  if (nodeModulesIndex < 0) {
    return null;
  }

  const packagePath = normalizedModuleId.slice(nodeModulesIndex + NODE_MODULES_SEGMENT.length);
  const segments = packagePath.split("/");
  const isScoped = segments[0]?.startsWith("@") ?? false;
  const packageSegments = isScoped ? segments.slice(0, 2) : segments.slice(0, 1);

  if (
    packageSegments.length !== (isScoped ? 2 : 1) ||
    packageSegments.some((segment) => !segment)
  ) {
    return null;
  }

  const name = packageSegments.join("/");
  const nodeModulesRoot = normalizedModuleId.slice(
    0,
    nodeModulesIndex + NODE_MODULES_SEGMENT.length,
  );

  return {
    name,
    root: `${nodeModulesRoot}${name}`,
  };
}

export function resolvePackageLegalFiles(packageRoot: string): string[] {
  const entries = fs.readdirSync(packageRoot, { withFileTypes: true });
  const fileNames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const availableFiles = new Set(fileNames);
  const licenseFiles: string[] = [];

  for (const fileName of PREFERRED_LICENSE_FILE_NAMES) {
    if (availableFiles.delete(fileName)) {
      licenseFiles.push(fileName);
    }
  }

  licenseFiles.push(
    ...fileNames
      .filter(
        (fileName) => availableFiles.has(fileName) && LICENSE_FILE_NAME_PATTERN.test(fileName),
      )
      .sort((left, right) => left.localeCompare(right)),
  );

  if (licenseFiles.length === 0) {
    throw new Error(`Could not find a license file for bundled package: ${packageRoot}`);
  }

  const noticeFiles = fileNames
    .filter((fileName) => NOTICE_FILE_NAME_PATTERN.test(fileName))
    .sort((left, right) => left.localeCompare(right));

  return [...licenseFiles, ...noticeFiles].map((fileName) => path.join(packageRoot, fileName));
}

export default function rolldownLicensePlugin(
  root: string,
  additionalLicenseFiles?: string[],
): Rolldown.Plugin {
  return {
    name: "rolldown-license-plugin",

    generateBundle(_, bundle) {
      const packageMap: Map<string, string> = new Map();
      Object.values(bundle).forEach((output) => {
        if (output.type === "chunk") {
          output.moduleIds.forEach((moduleId) => {
            const bundledPackage = resolveBundledPackage(moduleId);

            if (bundledPackage) {
              packageMap.set(bundledPackage.name, bundledPackage.root);
            }
          });
        }
      });

      const packages = [...packageMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const outputLicenses: string[] = [
        "# Bundled Third-Party Licenses",
        "This file contains licenses of third-party libraries bundled in this package.\n",
      ];

      const licenseSet: Set<string> = new Set();
      packages.forEach(([pkgName, pkgRootPath], index) => {
        outputLicenses.push(`## ${pkgName}`);
        const packageJsonPath = path.join(pkgRootPath, "package.json");
        const packageJsonText = fs.readFileSync(packageJsonPath, "utf8");
        const packageJson = JSON.parse(packageJsonText);
        if (packageJson.license) {
          outputLicenses.push(`License: ${packageJson.license}`);
          licenseSet.add(packageJson.license);
        }
        if (packageJson.author) {
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
        if (packageJson.repository) {
          if (typeof packageJson.repository === "string") {
            outputLicenses.push(`Repositories: ${packageJson.repository}`);
          } else if (packageJson.repository.url) {
            outputLicenses.push(`Repositories: ${packageJson.repository.url}`);
          }
        }
        outputLicenses.push("");

        const legalFiles = resolvePackageLegalFiles(pkgRootPath);
        legalFiles.forEach((legalFile, legalFileIndex) => {
          if (legalFiles.length > 1) {
            outputLicenses.push(`### ${path.basename(legalFile)}`, "");
          }

          const legalText = fs.readFileSync(legalFile, "utf8");
          outputLicenses.push(legalText.replace(/\n$/g, "").replace(/^/gm, "> "));

          if (legalFileIndex !== legalFiles.length - 1) {
            outputLicenses.push("");
          }
        });

        if (index !== packages.length - 1) {
          outputLicenses.push("\n---------------------------------------\n");
        }
      });

      const coreLicensePath = path.join(process.cwd(), "LICENSE");
      const coreLicenseText = fs.readFileSync(coreLicensePath, "utf8");
      const licenseHeader: string[] = [
        "# Vegas core license",
        "Vegas is released under the MIT license:\n",
        coreLicenseText,
      ];
      if (additionalLicenseFiles) {
        additionalLicenseFiles.forEach((licenseFile) => {
          const filePath = path.join(root, licenseFile);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf8");
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

      fs.writeFileSync(
        path.join(root, "LICENSE.md"),
        `${licenseHeader.concat(outputLicenses).join("\n")}\n`,
        "utf8",
      );
    },
  };
}
