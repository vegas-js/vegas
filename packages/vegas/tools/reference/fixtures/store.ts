import fsPromises from "node:fs/promises";
import path from "node:path";

import type { ReferenceResult, ReferenceMetadata } from "../core/types";

async function readJson<T>(p: string): Promise<T> {
  const content = await fsPromises.readFile(p, "utf8");
  return JSON.parse(content) as T;
}

async function writeJson(p: string, value: unknown): Promise<void> {
  await fsPromises.mkdir(path.dirname(p), {
    recursive: true,
  });

  await fsPromises.writeFile(p, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readReferenceMetadata(p: string): Promise<ReferenceMetadata> {
  return readJson<ReferenceMetadata>(p);
}

export async function writeReferenceMetadata(
  p: string,
  metadata: ReferenceMetadata,
): Promise<void> {
  await writeJson(p, metadata);
}

export async function readReferenceResult(p: string): Promise<ReferenceResult> {
  return readJson<ReferenceResult>(p);
}

export async function writeReferenceResult(p: string, fixture: ReferenceResult): Promise<void> {
  await writeJson(p, fixture);
}
