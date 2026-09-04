import { readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

const NODE_SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_ROOT = resolve(NODE_SOURCE_ROOT, "../..");

const RUNTIME_ROOT = join(NODE_SOURCE_ROOT, "runtime");
const WORKER_ROOT = join(NODE_SOURCE_ROOT, "worker");
const CLI_ROOT = join(NODE_SOURCE_ROOT, "cli");
const REFERENCE_EXECUTOR = join(PACKAGE_ROOT, "tools/reference/vegas/executor.ts");

const WORKER_RUNTIME_IMPORT_ALLOWLIST: Readonly<Record<string, readonly string[]>> = {
  "worker/index": [
    "runtime/environment",
    "runtime/execution",
    "runtime/execution/legacyWebAppResultProjection",
    "runtime/legacy/transport",
    "runtime/logging",
  ],
  "worker/runtimeTransport": ["runtime/errorCodec", "runtime/protocol"],
};

function listProductionTypeScriptFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(root, entry.name);

      if (entry.isDirectory()) {
        return listProductionTypeScriptFiles(path);
      }

      if (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".spec.ts") &&
        !entry.name.endsWith(".test.ts")
      ) {
        return [path];
      }

      return [];
    })
    .sort();
}

function extractModuleSpecifiers(source: string): string[] {
  const specifiers: string[] = [];

  const staticImportOrExportPattern =
    /\b(?:import|export)\s+(?:type\s+)?(?:(?:[\w$*{},\s]+)\s+from\s+)?["']([^"']+)["']/g;

  const dynamicImportPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const match of source.matchAll(staticImportOrExportPattern)) {
    specifiers.push(match[1]);
  }

  for (const match of source.matchAll(dynamicImportPattern)) {
    specifiers.push(match[1]);
  }

  return specifiers;
}

function resolveRelativeImport(importer: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }

  return resolve(dirname(importer), specifier);
}

function isWithin(path: string, root: string): boolean {
  const relativePath = relative(root, path);

  return (
    relativePath === "" ||
    (relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
  );
}

function toNodeRelativeModulePath(path: string): string {
  return relative(NODE_SOURCE_ROOT, path)
    .split(sep)
    .join("/")
    .replace(/\.(?:[cm]?[jt]s)$/, "");
}

function findRelativeImports(files: readonly string[]) {
  return files.flatMap((file) => {
    const source = readFileSync(file, "utf-8");

    return extractModuleSpecifiers(source).flatMap((specifier) => {
      const target = resolveRelativeImport(file, specifier);

      if (!target) {
        return [];
      }

      return [
        {
          importer: file,
          specifier,
          target,
        },
      ];
    });
  });
}

test("runtime production code does not depend on worker or cli", () => {
  const runtimeFiles = listProductionTypeScriptFiles(RUNTIME_ROOT);

  const violations = findRelativeImports(runtimeFiles)
    .filter(({ target }) => isWithin(target, WORKER_ROOT) || isWithin(target, CLI_ROOT))
    .map(({ importer, specifier }) => `${toNodeRelativeModulePath(importer)} -> ${specifier}`);

  expect(violations).toEqual([]);
});

test("worker accesses runtime only through approved adapter boundaries", () => {
  const workerFiles = listProductionTypeScriptFiles(WORKER_ROOT);

  const violations = findRelativeImports(workerFiles)
    .filter(({ target }) => isWithin(target, RUNTIME_ROOT))
    .flatMap(({ importer, specifier, target }) => {
      const importerPath = toNodeRelativeModulePath(importer);
      const targetPath = toNodeRelativeModulePath(target);
      const allowedTargets = WORKER_RUNTIME_IMPORT_ALLOWLIST[importerPath] ?? [];

      if (allowedTargets.includes(targetPath)) {
        return [];
      }

      return [`${importerPath} -> ${specifier}`];
    });

  expect(violations).toEqual([]);
});

test("reference executor does not depend on worker", () => {
  const violations = findRelativeImports([REFERENCE_EXECUTOR])
    .filter(({ target }) => isWithin(target, WORKER_ROOT))
    .map(
      ({ importer, specifier }) =>
        `${relative(PACKAGE_ROOT, importer).split(sep).join("/")} -> ${specifier}`,
    );

  expect(violations).toEqual([]);
});

test("reference executor uses canonical script execution orchestration", () => {
  const importedRuntimeModules = findRelativeImports([REFERENCE_EXECUTOR])
    .filter(({ target }) => isWithin(target, RUNTIME_ROOT))
    .map(({ target }) => toNodeRelativeModulePath(target));

  expect(importedRuntimeModules).toContain("runtime/execution/scriptExecution");

  expect(importedRuntimeModules).not.toContain("runtime/execution/invocation");

  expect(importedRuntimeModules).not.toContain("runtime/execution/scriptRuntime");
});
