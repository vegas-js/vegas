import { describe, expect, test } from "vitest";

import {
  InMemoryDriveIteratorStore,
  type DriveFileReference,
  type DriveFolderReference,
  type DriveNamespace,
} from "../index";

const FILES = [
  { service: "drive", kind: "file", id: "a" },
  { service: "drive", kind: "file", id: "b" },
] as const satisfies readonly DriveFileReference[];

const FOLDERS = [
  { service: "drive", kind: "folder", id: "folder-a" },
] as const satisfies readonly DriveFolderReference[];

const LOCAL_CONTINUATION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

const USER_A = { userKey: "user-a" } as const satisfies DriveNamespace;
const USER_B = { userKey: "user-b" } as const satisfies DriveNamespace;

describe("InMemoryDriveIteratorStore", () => {
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

  test("expire file and folder continuation tokens at the local seven-day boundary", async () => {
    let nowMs = 1_000;
    const store = new InMemoryDriveIteratorStore(() => nowMs);
    const initial = store.createSession(USER_A);
    const fileToken = await initial.getContinuationToken(await initial.createFileIterator(FILES));
    const folderToken = await initial.getContinuationToken(
      await initial.createFolderIterator(FOLDERS),
    );

    nowMs += LOCAL_CONTINUATION_TTL_MS - 1;
    const beforeExpiry = store.createSession(USER_A);
    await expect(beforeExpiry.continueFileIterator(fileToken)).resolves.toMatchObject({
      kind: "file-iterator",
    });
    await expect(beforeExpiry.continueFolderIterator(folderToken)).resolves.toMatchObject({
      kind: "folder-iterator",
    });

    nowMs += 1;
    const expired = store.createSession(USER_A);
    await expect(expired.continueFileIterator(fileToken)).rejects.toThrow(
      `Unknown Drive continuation token: ${fileToken}`,
    );
    await expect(expired.continueFolderIterator(folderToken)).rejects.toThrow(
      `Unknown Drive continuation token: ${folderToken}`,
    );
  });

  test("retain newer continuation tokens when expired ones are discarded", async () => {
    let nowMs = 0;
    const store = new InMemoryDriveIteratorStore(() => nowMs);
    const initial = store.createSession(USER_A);
    const staleToken = await initial.getContinuationToken(await initial.createFileIterator(FILES));

    nowMs = LOCAL_CONTINUATION_TTL_MS / 2;
    const newerToken = await initial.getContinuationToken(await initial.createFileIterator(FILES));

    nowMs = LOCAL_CONTINUATION_TTL_MS;
    const currentToken = await initial.getContinuationToken(
      await initial.createFileIterator(FILES),
    );
    const restored = store.createSession(USER_A);

    await expect(restored.continueFileIterator(staleToken)).rejects.toThrow(
      `Unknown Drive continuation token: ${staleToken}`,
    );
    await expect(restored.continueFileIterator(newerToken)).resolves.toMatchObject({
      kind: "file-iterator",
    });
    await expect(restored.continueFileIterator(currentToken)).resolves.toMatchObject({
      kind: "file-iterator",
    });
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
