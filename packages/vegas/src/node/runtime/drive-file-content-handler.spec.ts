import { describe, expect, test } from "vitest";

import {
  hydrateBlob,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  LocalDriveHostHandler,
  type BlobValue,
  type DriveNamespace,
} from "./index";

const USER = { userKey: "user-a" } as const satisfies DriveNamespace;

function createBlobValue(): BlobValue {
  return {
    bytes: [98, 101, 102, 111, 114, 101],
    contentType: "text/plain",
    name: "content.txt",
    googleType: false,
  };
}

describe("LocalDriveHostHandler file content", () => {
  test("persist UTF-8 content across invocation-local handlers without changing metadata", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const file = await store.createFile(USER, root, createBlobValue());
    const iterators = new InMemoryDriveIteratorStore();
    const firstHandler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      firstHandler.handle({
        service: "drive",
        operation: "set-file-content",
        file,
        content: "更新",
      }),
    ).resolves.toBeUndefined();

    const secondHandler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));
    const result = await secondHandler.handle({
      service: "drive",
      operation: "get-file-blob",
      file,
    });

    if (typeof result !== "object" || result === null || !("bytes" in result)) {
      throw new Error("expected BlobValue");
    }

    const blob = hydrateBlob(result);

    expect(blob.getDataAsString()).toBe("更新");
    expect(blob.getName()).toBe("content.txt");
    expect(blob.getContentType()).toBe("text/plain");
  });

  test("reject content larger than the local 10 MB limit without mutating state", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const file = await store.createFile(USER, root, createBlobValue());
    const iterators = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      handler.handle({
        service: "drive",
        operation: "set-file-content",
        file,
        content: "a".repeat(10_000_001),
      }),
    ).rejects.toThrow("Local Drive file content exceeds the 10 MB limit.");

    await expect(store.getFileBlob(USER, file)).resolves.toStrictEqual(createBlobValue());
  });
});
