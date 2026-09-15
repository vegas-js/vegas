import crypto from "node:crypto";
import fs from "node:fs";
import module from "node:module";
import path from "node:path";

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
): ClaspProjectConfig {
  return {
    parentId: overrides.parentId ?? stringValue(config.parentId),
    scriptId: overrides.scriptId ?? stringValue(config.scriptId),
    rootDir: "dist",
  };
}

export async function runPush() {
  const cwd = process.cwd();
  const importer = path.join(cwd, "index.js");

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
  const claspConfigPath = path.join(cwd, ".clasp.json");
  const claspConfig = fs.existsSync(claspConfigPath)
    ? JSON.parse(fs.readFileSync(claspConfigPath, "utf8"))
    : {};
  const projectConfig = createClaspProjectConfig(claspConfig, {
    parentId: process.env.VEGAS_PARENT_ID,
    scriptId: process.env.VEGAS_SCRIPT_ID,
  });

  const projectFilePath = path.join(cwd, `.vegas-clasp-${crypto.randomUUID()}.json`);

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
