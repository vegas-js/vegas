import { describe, expect, test } from "vitest";

import { InMemoryDriveIteratorStore, type DriveFileReference } from "./index";

const FILES = [
  { service: "drive", kind: "file", id: "a" },
  { service: "drive", kind: "file", id: "b" },
] as const satisfies readonly DriveFileReference[];

describe("InMemoryDriveIteratorStore", () => {
  test("keep iterator handles scoped to one invocation session", async () => {
    const store = new InMemoryDriveIteratorStore();
    const firstSession = store.createSession();
    const secondSession = store.createSession();
    const iterator = await firstSession.createFileIterator(FILES);

    await expect(secondSession.hasNext(iterator)).rejects.toThrow(
      "Unknown Drive file iterator handle",
    );
  });

  test("snapshot continuation state independently from later iterator consumption", async () => {
    const store = new InMemoryDriveIteratorStore();
    const firstSession = store.createSession();
    const iterator = await firstSession.createFileIterator(FILES);

    expect(await firstSession.nextFile(iterator)).toStrictEqual(FILES[0]);

    const token = await firstSession.getContinuationToken(iterator);

    expect(token).not.toBe(iterator.handle);
    expect(await firstSession.nextFile(iterator)).toStrictEqual(FILES[1]);
    expect(await firstSession.hasNext(iterator)).toBe(false);

    const secondSession = store.createSession();
    const resumed = await secondSession.continueFileIterator(token);

    expect(resumed.handle).not.toBe(iterator.handle);
    expect(await secondSession.nextFile(resumed)).toStrictEqual(FILES[1]);
    expect(await secondSession.hasNext(resumed)).toBe(false);
  });

  test("keep file and folder continuation tokens type-safe", async () => {
    const store = new InMemoryDriveIteratorStore();
    const session = store.createSession();
    const fileIterator = await session.createFileIterator(FILES);
    const token = await session.getContinuationToken(fileIterator);

    await expect(session.continueFolderIterator(token)).rejects.toThrow(
      "Drive continuation token is not for a folder iterator",
    );
  });
});
