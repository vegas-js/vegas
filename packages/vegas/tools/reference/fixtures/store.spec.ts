import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import { readReferenceFixture, writeReferenceFixture } from "./store";

const paths: string[] = [];

afterEach(async () => {
  await Promise.all(
    paths.map((path) =>
      fsPromises.rm(path, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

test("writes a reference fixture as formatted JSON", async () => {
  const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "vegas-reference-"));
  paths.push(dir);
  const p = path.join(dir, "fixtures", "smoke.json");
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
  await writeReferenceFixture(p, fixture);
  const content = await fsPromises.readFile(p, "utf8");

  expect(content).toBe(`${JSON.stringify(fixture, null, 2)}\n`);
});

test("reads a reference fixture", async () => {
  const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "vegas-reference-"));
  paths.push(dir);

  const p = path.join(dir, "smoke.json");

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

  await fsPromises.writeFile(p, JSON.stringify(fixture), "utf8");

  await expect(readReferenceFixture(p)).resolves.toEqual(fixture);
});
