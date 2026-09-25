import { describe, expect, test } from "vitest";

import {
  InMemoryDriveIteratorSession,
  type DriveIteratorContinuationState,
} from "./in-memory-drive-iterator-session";
import type { DriveFileReference, DriveFolderReference, DriveNamespace } from "./index";

const FILES = [
  { service: "drive", kind: "file", id: "a" },
  { service: "drive", kind: "file", id: "b" },
] as const satisfies readonly DriveFileReference[];

const FOLDERS = [
  { service: "drive", kind: "folder", id: "a" },
  { service: "drive", kind: "folder", id: "b" },
] as const satisfies readonly DriveFolderReference[];

const USER_A = { userKey: "user-a" } as const satisfies DriveNamespace;

function createSession(sessionId: number): InMemoryDriveIteratorSession {
  return new InMemoryDriveIteratorSession(
    sessionId,
    USER_A,
    () => "unused-token",
    () => {
      throw new Error("unexpected continuation load");
    },
  );
}

function createContinuableSession(sessionId: number): InMemoryDriveIteratorSession {
  const continuations = new Map<string, DriveIteratorContinuationState>();
  let nextTokenId = 0;

  return new InMemoryDriveIteratorSession(
    sessionId,
    USER_A,
    (namespace, state) => {
      expect(namespace).toStrictEqual(USER_A);
      nextTokenId += 1;
      const token = `continuation:${sessionId}:${nextTokenId}`;
      continuations.set(token, state);
      return token;
    },
    (namespace, token) => {
      expect(namespace).toStrictEqual(USER_A);
      const state = continuations.get(token);
      if (state === undefined) {
        throw new Error(`unknown continuation token: ${token}`);
      }
      return state;
    },
  );
}

describe("InMemoryDriveIteratorSession", () => {
  test("keep iterator handles scoped to one invocation session", async () => {
    const firstSession = createSession(1);
    const secondSession = createSession(2);
    const iterator = await firstSession.createFileIterator(FILES);

    await expect(secondSession.hasNext(iterator)).rejects.toThrow(
      "Unknown Drive file iterator handle",
    );
  });

  test("keep file and folder continuation tokens type-safe", async () => {
    const continuation = {
      kind: "file",
      state: {
        values: FILES,
        index: 0,
      },
    } satisfies DriveIteratorContinuationState;
    const session = new InMemoryDriveIteratorSession(
      1,
      USER_A,
      () => "file-token",
      () => continuation,
    );

    await expect(session.continueFolderIterator("file-token")).rejects.toThrow(
      "Drive continuation token is not for a folder iterator",
    );
  });

  test("resume file iteration from the position captured by a continuation token", async () => {
    const session = createContinuableSession(1);
    const iterator = await session.createFileIterator(FILES);

    expect(await session.hasNext(iterator)).toBe(true);
    expect((await session.nextFile(iterator)).id).toBe("a");

    const token = await session.getContinuationToken(iterator);

    expect((await session.nextFile(iterator)).id).toBe("b");
    expect(await session.hasNext(iterator)).toBe(false);
    await expect(session.nextFile(iterator)).rejects.toThrow(
      "Drive file iterator has no next value",
    );

    const resumed = await session.continueFileIterator(token);

    expect((await session.nextFile(resumed)).id).toBe("b");
    expect(await session.hasNext(resumed)).toBe(false);
  });

  test("resume folder iteration from the position captured by a continuation token", async () => {
    const session = createContinuableSession(1);
    const iterator = await session.createFolderIterator(FOLDERS);

    expect(await session.hasNext(iterator)).toBe(true);
    expect((await session.nextFolder(iterator)).id).toBe("a");

    const token = await session.getContinuationToken(iterator);

    expect((await session.nextFolder(iterator)).id).toBe("b");
    expect(await session.hasNext(iterator)).toBe(false);
    await expect(session.nextFolder(iterator)).rejects.toThrow(
      "Drive folder iterator has no next value",
    );

    const resumed = await session.continueFolderIterator(token);

    expect((await session.nextFolder(resumed)).id).toBe("b");
    expect(await session.hasNext(resumed)).toBe(false);
  });
});
