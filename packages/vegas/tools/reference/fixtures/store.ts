import fsPromises from "node:fs/promises";
import path from "node:path";

import type { ReferenceFixture } from "../core/types";

export async function readReferenceFixture(path: string): Promise<ReferenceFixture> {
  const content = await fsPromises.readFile(path, "utf8");
  return JSON.parse(content) as ReferenceFixture;
}

export async function writeReferenceFixture(p: string, fixture: ReferenceFixture): Promise<void> {
  await fsPromises.mkdir(path.dirname(p), {
    recursive: true,
  });

  await fsPromises.writeFile(p, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
}
