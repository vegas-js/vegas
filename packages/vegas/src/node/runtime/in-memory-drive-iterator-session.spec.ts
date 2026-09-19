import { describe, expect, test } from "vitest";

import {
  InMemoryDriveIteratorSession,
  type DriveIteratorContinuationState,
} from "./in-memory-drive-iterator-session";
import type { DriveFileReference, DriveNamespace } from "./index";

const FILES = [
  { service: "drive", kind: "file", id: "a" },
  { service: "drive", kind: "file", id: "b" },
] as const satisfies readonly DriveFileReference[];

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
});
