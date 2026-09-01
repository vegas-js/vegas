import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { ReferenceFixture } from "./types";

export async function writeReferenceFixture(
  path: string,
  fixture: ReferenceFixture,
): Promise<void> {
  await mkdir(dirname(path), {
    recursive: true,
  });

  await writeFile(path, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
}
