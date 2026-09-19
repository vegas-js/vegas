import fs from "node:fs";
import path from "node:path";

import type { Rolldown } from "tsdown";

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

export function collectBundledPackages(moduleIds: Iterable<string>): BundledPackage[] {
  const packagesByRoot = new Map<string, BundledPackage>();

  for (const moduleId of moduleIds) {
    const bundledPackage = resolveBundledPackage(moduleId);

    if (bundledPackage) {
      packagesByRoot.set(bundledPackage.root, bundledPackage);
    }
  }

  return [...packagesByRoot.values()].sort(
    (left, right) => left.name.localeCompare(right.name) || left.root.localeCompare(right.root),
  );
}

export function formatBundledPackageHeading(
  packageName: string,
  packageVersion: unknown,
  includeVersion: boolean,
): string {
  if (!includeVersion) {
    return packageName;
  }

  if (typeof packageVersion !== "string" || packageVersion.length === 0) {
    throw new Error(`Could not determine version for duplicate bundled package: ${packageName}`);
  }

  return `${packageName}@${packageVersion}`;
}

export function readAdditionalLicenseFiles(
  packageRoot: string,
  additionalLicenseFiles: readonly string[] | undefined,
): string[] {
  return (additionalLicenseFiles ?? []).map((licenseFile) => {
    const filePath = path.join(packageRoot, licenseFile);

    const stats = fs.statSync(filePath, { throwIfNoEntry: false });

    if (!stats?.isFile()) {
      throw new Error(`Could not find additional license file: ${filePath}`);
    }

    return fs.readFileSync(filePath, "utf8");
  });
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

function readPackageJson(packageRoot: string) {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
}

function countPackageNames(packages: readonly BundledPackage[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const { name } of packages) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return counts;
}

function renderPackageLegalFiles(packageRoot: string): string[] {
  const legalFiles = resolvePackageLegalFiles(packageRoot);
  const lines: string[] = [];

  legalFiles.forEach((legalFile, index) => {
    if (legalFiles.length > 1) {
      lines.push(`### ${path.basename(legalFile)}`, "");
    }

    const legalText = fs.readFileSync(legalFile, "utf8");
    lines.push(legalText.replace(/\n$/g, "").replace(/^/gm, "> "));

    if (index !== legalFiles.length - 1) {
      lines.push("");
    }
  });

  return lines;
}

function renderBundledPackage(
  bundledPackage: BundledPackage,
  includeVersion: boolean,
  licenses: Set<string>,
): string[] {
  const packageJson = readPackageJson(bundledPackage.root);
  const heading = formatBundledPackageHeading(
    bundledPackage.name,
    packageJson.version,
    includeVersion,
  );
  const lines: string[] = [`## ${heading}`];

  if (packageJson.license) {
    lines.push(`License: ${packageJson.license}`);
    licenses.add(packageJson.license);
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

      lines.push(`By: ${author.join(" ")}`);
    } else {
      lines.push(`By: ${packageJson.author}`);
    }
  }

  if (packageJson.repository) {
    if (typeof packageJson.repository === "string") {
      lines.push(`Repositories: ${packageJson.repository}`);
    } else if (packageJson.repository.url) {
      lines.push(`Repositories: ${packageJson.repository.url}`);
    }
  }

  lines.push("", ...renderPackageLegalFiles(bundledPackage.root));

  return lines;
}

function renderBundledLicenses(packages: readonly BundledPackage[]): {
  readonly lines: string[];
  readonly licenses: string[];
} {
  const packageNameCounts = countPackageNames(packages);
  const licenses = new Set<string>();
  const lines: string[] = [
    "# Bundled Third-Party Licenses",
    "This file contains licenses of third-party libraries bundled in this package.\n",
  ];

  packages.forEach((bundledPackage, index) => {
    lines.push(
      ...renderBundledPackage(
        bundledPackage,
        (packageNameCounts.get(bundledPackage.name) ?? 0) > 1,
        licenses,
      ),
    );

    if (index !== packages.length - 1) {
      lines.push("\n---------------------------------------\n");
    }
  });

  return {
    lines,
    licenses: [...licenses].sort(),
  };
}

export default function rolldownLicensePlugin(
  root: string,
  additionalLicenseFiles?: string[],
): Rolldown.Plugin {
  return {
    name: "rolldown-license-plugin",

    generateBundle(_, bundle) {
      const moduleIds: string[] = [];

      for (const output of Object.values(bundle)) {
        if (output.type === "chunk") {
          moduleIds.push(...output.moduleIds);
        }
      }

      const { lines: bundledLicenseLines, licenses } = renderBundledLicenses(
        collectBundledPackages(moduleIds),
      );
      const coreLicensePath = path.resolve(root, "..", "..", "LICENSE");
      const licenseLines: string[] = [
        "# Vegas core license",
        "Vegas is released under the MIT license:\n",
        fs.readFileSync(coreLicensePath, "utf8"),
        ...readAdditionalLicenseFiles(root, additionalLicenseFiles),
        "# Licenses of bundled dependencies",
        "The published Vegas artifact additionally contains code with the following licenses:",
        licenses.join(", "),
        "",
        ...bundledLicenseLines,
      ];

      fs.writeFileSync(path.join(root, "LICENSE.md"), `${licenseLines.join("\n")}\n`, "utf8");
    },
  };
}
