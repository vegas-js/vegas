import fs from "node:fs";
import path from "node:path";

import JSON5 from "json5";

export function parseClaspProjectConfig(content: string): Record<string, unknown> {
  return JSON5.parse(content) as Record<string, unknown>;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function readClaspScriptId(projectRoot: string): Promise<string | undefined> {
  const configPath = path.join(projectRoot, ".clasp.json");

  let content: string;

  try {
    content = await fs.promises.readFile(configPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }

    throw error;
  }

  const config = parseClaspProjectConfig(content);

  return stringValue(config.scriptId);
}
