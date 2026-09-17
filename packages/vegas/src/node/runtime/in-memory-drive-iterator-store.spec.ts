import { describe, expect, test } from "vitest";

import { InMemoryDriveIteratorStore, type DriveFileReference, type DriveNamespace } from "./index";

const FILES = [
  { service: "drive", kind: "file", id: "a" },
  { service: "drive", kind: "file", id: "b" },
] as const satisfies readonly DriveFileReference[];

const USER_A = { userKey: "user-a" } as const satisfies DriveNamespace;
const USER_B = { userKey: "user-b" } as const satisfies DriveNamespace;

describe("InMemoryDriveIteratorStore", () => {
  test("keep iterator handles scoped to one invocation session", async () => {
    const store = new InMemoryDriveIteratorStore();
    const firstSession = store.createSession(USER_A);
    const secondSession = store.createSession(USER_A);
    const iterator = await firstSession.createFileIterator(FILES);

    await expect(secondSession.hasNext(iterator)).rejects.toThrow(
      "Unknown Drive file iterator handle",
    );
  });

  test("snapshot continuation state independently from later iterator consumption", async () => {
    const store = new InMemoryDriveIteratorStore();
    const firstSession = store.createSession(USER_A);
    const iterator = await firstSession.createFileIterator(FILES);

    expect(await firstSession.nextFile(iterator)).toStrictEqual(FILES[0]);

    const token = await firstSession.getContinuationToken(iterator);

    expect(token).not.toBe(iterator.handle);
    expect(await firstSession.nextFile(iterator)).toStrictEqual(FILES[1]);
    expect(await firstSession.hasNext(iterator)).toBe(false);

    const secondSession = store.createSession(USER_A);
    const resumed = await secondSession.continueFileIterator(token);

    expect(resumed.handle).not.toBe(iterator.handle);
    expect(await secondSession.nextFile(resumed)).toStrictEqual(FILES[1]);
    expect(await secondSession.hasNext(resumed)).toBe(false);
  });

  test("keep file and folder continuation tokens type-safe", async () => {
    const store = new InMemoryDriveIteratorStore();
    const session = store.createSession(USER_A);
    const fileIterator = await session.createFileIterator(FILES);
    const token = await session.getContinuationToken(fileIterator);

    await expect(session.continueFolderIterator(token)).rejects.toThrow(
      "Drive continuation token is not for a folder iterator",
    );
  });

  test("bind continuation tokens to the Drive user namespace", async () => {
    const store = new InMemoryDriveIteratorStore();
    const firstSession = store.createSession(USER_A);
    const iterator = await firstSession.createFileIterator(FILES);
    const token = await firstSession.getContinuationToken(iterator);
    const otherUserSession = store.createSession(USER_B);

    await expect(otherUserSession.continueFileIterator(token)).rejects.toThrow(
      "Drive continuation token is not available in this Drive namespace",
    );
  });
});
