import crypto from "node:crypto";
import fs from "node:fs";
import module from "node:module";
import path from "node:path";

import { loadProject } from "../project";

interface ClaspProjectConfig {
  readonly parentId?: string;
  readonly scriptId?: string;
  readonly rootDir: string;
}

interface ClaspConfigOverrides {
  readonly parentId?: string;
  readonly scriptId?: string;
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

export async function runPush(root?: string) {
  const cwd = process.cwd();
  const project = await loadProject({
    cwd,
    root,
  });

  if (!fs.existsSync(project.outputDir) || !fs.statSync(project.outputDir).isDirectory()) {
    throw new Error(`Build output directory not found: ${project.outputDir}`);
  }

  const importer = path.join(project.root, "index.js");

  const pkgJsonPath = module.findPackageJSON("@google/clasp", importer);

  if (!pkgJsonPath) {
    return;
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  const pkgBin = pkgJson.bin.clasp;

  if (typeof pkgBin !== "string") {
    return;
  }

  const claspPath = path.resolve(path.dirname(pkgJsonPath), pkgBin);
  const claspConfigPath = path.join(project.root, ".clasp.json");
  const claspConfig = fs.existsSync(claspConfigPath)
    ? JSON.parse(fs.readFileSync(claspConfigPath, "utf8"))
    : {};
  const projectConfig = createClaspProjectConfig(
    claspConfig,
    {
      parentId: process.env.VEGAS_PARENT_ID,
      scriptId: process.env.VEGAS_SCRIPT_ID,
    },
    ".",
  );

  const projectFilePath = path.join(project.outputDir, `.vegas-clasp-${crypto.randomUUID()}.json`);

  const prevArgv = process.argv;

  try {
    fs.writeFileSync(projectFilePath, JSON.stringify(projectConfig), "utf8");

    process.argv = [...prevArgv.slice(0, 3), "--project", projectFilePath];

    await import(claspPath);
  } finally {
    process.argv = prevArgv;

    fs.rmSync(projectFilePath, { force: true });
  }
}
