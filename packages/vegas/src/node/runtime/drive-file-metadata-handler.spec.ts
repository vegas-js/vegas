import { describe, expect, test } from "vitest";

import {
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  LocalDriveHostHandler,
  type BlobValue,
  type DriveNamespace,
} from "./index";

const USER = { userKey: "user-a" } as const satisfies DriveNamespace;

function createBlobValue(name: string | null, contentType: string | null): BlobValue {
  return {
    bytes: [65],
    contentType,
    name,
    googleType: false,
  };
}

describe("LocalDriveHostHandler file metadata", () => {
  test("return file name and MIME type as Google-facing strings", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const file = await store.createFile(USER, root, createBlobValue("a.txt", "text/plain"));
    const iterators = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      handler.handle({
        service: "drive",
        operation: "get-file-name",
        file,
      }),
    ).resolves.toBe("a.txt");
    await expect(
      handler.handle({
        service: "drive",
        operation: "get-file-mime-type",
        file,
      }),
    ).resolves.toBe("text/plain");
  });

  test("persist file name mutations across invocation-local handlers", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const file = await store.createFile(USER, root, createBlobValue("a.txt", "text/plain"));
    const iterators = new InMemoryDriveIteratorStore();
    const firstHandler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      firstHandler.handle({
        service: "drive",
        operation: "set-file-name",
        file,
        name: "renamed.txt",
      }),
    ).resolves.toBeUndefined();

    const secondHandler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      secondHandler.handle({
        service: "drive",
        operation: "get-file-name",
        file,
      }),
    ).resolves.toBe("renamed.txt");
  });

  test("reject unknown local metadata instead of inventing Google values", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const file = await store.createFile(USER, root, createBlobValue(null, null));
    const iterators = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      handler.handle({
        service: "drive",
        operation: "get-file-name",
        file,
      }),
    ).rejects.toThrow(`Local Drive file name is unavailable: ${file.id}`);
    await expect(
      handler.handle({
        service: "drive",
        operation: "get-file-mime-type",
        file,
      }),
    ).rejects.toThrow(`Local Drive file MIME type is unavailable: ${file.id}`);
  });
});
