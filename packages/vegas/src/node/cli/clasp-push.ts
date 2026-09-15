import crypto from "node:crypto";
import fs from "node:fs";
import module from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import JSON5 from "json5";

interface ClaspProjectConfig {
  readonly parentId?: string;
  readonly scriptId?: string;
  readonly rootDir: string;
}

interface ClaspConfigOverrides {
  readonly parentId?: string;
  readonly scriptId?: string;
}

interface ClaspPushOptions {
  readonly projectRoot: string;
  readonly outputDir: string;
}

export function parseClaspProjectConfig(content: string): Record<string, unknown> {
  return JSON5.parse(content) as Record<string, unknown>;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function createClaspProjectConfig(
  config: Record<string, unknown>,
  overrides: ClaspConfigOverrides,
  rootDir: string,
): ClaspProjectConfig {
  return {
    parentId: overrides.parentId ?? stringValue(config.parentId),
    scriptId: overrides.scriptId ?? stringValue(config.scriptId),
    rootDir,
  };
}

export function createClaspArgv(
  argv: readonly string[],
  projectFilePath: string,
  ignoreFilePath?: string,
): string[] {
  return [
    ...argv.slice(0, 2),
    "push",
    "--project",
    projectFilePath,
    ...(ignoreFilePath ? ["--ignore", ignoreFilePath] : []),
  ];
}

export async function pushWithClasp(options: ClaspPushOptions): Promise<void> {
  const importer = path.join(options.projectRoot, "index.js");

  const pkgJsonPath = module.findPackageJSON("@google/clasp", importer);
  if (!pkgJsonPath) {
    throw new Error(`@google/clasp is not installed for project: ${options.projectRoot}`);
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  const pkgBin = pkgJson?.bin?.clasp;
  if (typeof pkgBin !== "string") {
    throw new Error(`Invalid @google/clasp package: clasp executable not found.`);
  }

  const claspPath = path.resolve(path.dirname(pkgJsonPath), pkgBin);

  const claspIgnorePath = path.join(options.projectRoot, ".claspignore");
  const ignoreFilePath =
    process.env.clasp_config_ignore === undefined && fs.existsSync(claspIgnorePath)
      ? claspIgnorePath
      : undefined;

  const claspConfigPath = path.join(options.projectRoot, ".clasp.json");
  const claspConfig = fs.existsSync(claspConfigPath)
    ? parseClaspProjectConfig(fs.readFileSync(claspConfigPath, "utf8"))
    : {};

  const projectConfig = createClaspProjectConfig(
    claspConfig,
    {
      parentId: process.env.VEGAS_PARENT_ID,
      scriptId: process.env.VEGAS_SCRIPT_ID,
    },
    ".",
  );

  const projectFilePath = path.join(options.outputDir, `.vegas-clasp-${crypto.randomUUID()}.json`);
  const prevArgv = process.argv;

  try {
    fs.writeFileSync(projectFilePath, JSON.stringify(projectConfig), "utf8");

    process.argv = createClaspArgv(prevArgv, projectFilePath, ignoreFilePath);

    await import(pathToFileURL(claspPath).href);
  } finally {
    process.argv = prevArgv;

    fs.rmSync(projectFilePath, { force: true });
  }
}
