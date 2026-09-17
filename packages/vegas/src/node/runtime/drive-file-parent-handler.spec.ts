import { describe, expect, test } from "vitest";

import {
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  LocalDriveHostHandler,
  type BlobValue,
  type DriveNamespace,
} from "./index";

const USER = { userKey: "user-a" } as const satisfies DriveNamespace;

const BLOB = {
  bytes: [65],
  contentType: "text/plain",
  name: "a.txt",
  googleType: false,
} as const satisfies BlobValue;

describe("LocalDriveHostHandler file parent mutation", () => {
  test("persist moveTo topology across invocation-local handlers", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const source = await store.createFolder(USER, root, "source");
    const destination = await store.createFolder(USER, root, "destination");
    const file = await store.createFile(USER, source, BLOB);
    const iterators = new InMemoryDriveIteratorStore();
    const firstHandler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      firstHandler.handle({
        service: "drive",
        operation: "move-file",
        file,
        destination,
      }),
    ).resolves.toBeUndefined();

    const secondHandler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));
    const parents = await secondHandler.handle({
      service: "drive",
      operation: "get-file-parents",
      file,
    });

    if (
      typeof parents !== "object" ||
      parents === null ||
      !("kind" in parents) ||
      parents.kind !== "folder-iterator"
    ) {
      throw new Error("expected folder iterator reference");
    }

    await expect(
      secondHandler.handle({
        service: "drive",
        operation: "folder-iterator-next",
        iterator: parents,
      }),
    ).resolves.toStrictEqual(destination);
    await expect(
      secondHandler.handle({
        service: "drive",
        operation: "iterator-has-next",
        iterator: parents,
      }),
    ).resolves.toBe(false);
  });
});
