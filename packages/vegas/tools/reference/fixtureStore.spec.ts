import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, expect, test } from "vitest";

import { writeReferenceFixture } from "./fixtureStore";

const paths: string[] = [];

afterEach(async () => {
  await Promise.all(
    paths.map((path) =>
      rm(path, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

test("writes a reference fixture as formatted JSON", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vegas-reference-"));
  paths.push(dir);
  const path = join(dir, "fixtures", "smoke.json");
  const fixture = {
    metadata: {
      schemaVersion: 1,
      runtime: "V8" as const,
      caseRevision: "revision",
    },
    result: {
      value: "result",
    },
  };
  await writeReferenceFixture(path, fixture);
  const content = await readFile(path, "utf8");

  expect(content).toBe(`${JSON.stringify(fixture, null, 2)}\n`);
});
