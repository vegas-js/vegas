import { describe, expect, test } from "vitest";

import {
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  LocalDriveHostHandler,
  type DriveNamespace,
} from "./index";

const USER_A = { userKey: "user-a" } as const satisfies DriveNamespace;
const USER_B = { userKey: "user-b" } as const satisfies DriveNamespace;

describe("local Drive folder resources", () => {
  test("persist folder names and direct parent-child relationships", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER_A);
    const parent = await store.createFolder(USER_A, root, "parent");
    const child = await store.createFolder(USER_A, parent, "child");

    await expect(store.getFolderName(USER_A, parent)).resolves.toBe("parent");
    await expect(store.getFolderName(USER_A, child)).resolves.toBe("child");
    await expect(store.listFolders(USER_A)).resolves.toStrictEqual([parent, child]);
    await expect(store.listFolderFolders(USER_A, root)).resolves.toStrictEqual([parent]);
    await expect(store.listFolderFolders(USER_A, parent)).resolves.toStrictEqual([child]);
    await expect(store.listFolderParents(USER_A, root)).resolves.toStrictEqual([]);
    await expect(store.listFolderParents(USER_A, parent)).resolves.toStrictEqual([root]);
    await expect(store.listFolderParents(USER_A, child)).resolves.toStrictEqual([parent]);
  });

  test("keep created folders isolated to their user namespace", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER_A);
    const child = await store.createFolder(USER_A, root, "private");

    await expect(store.getFolder(USER_B, child.id)).rejects.toThrow(
      `Unknown local Drive folder: ${child.id}`,
    );
    await expect(store.createFolder(USER_B, root, "invalid")).rejects.toThrow(
      `Unknown local Drive folder: ${root.id}`,
    );
    await expect(store.listFolders(USER_B)).resolves.toStrictEqual([]);
  });

  test("route folder mutation and parent traversal through LocalDriveHostHandler", async () => {
    const store = new InMemoryDriveStore();
    const iteratorStore = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER_A, iteratorStore.createSession(USER_A));
    const root = await handler.handle({ service: "drive", operation: "get-root-folder" });

    if (typeof root !== "object" || root === null || !("kind" in root) || root.kind !== "folder") {
      throw new Error("expected root folder reference");
    }

    const child = await handler.handle({
      service: "drive",
      operation: "create-folder",
      parent: root,
      name: "child",
    });

    if (
      typeof child !== "object" ||
      child === null ||
      !("kind" in child) ||
      child.kind !== "folder"
    ) {
      throw new Error("expected child folder reference");
    }

    await expect(
      handler.handle({
        service: "drive",
        operation: "get-folder-name",
        folder: child,
      }),
    ).resolves.toBe("child");

    const parents = await handler.handle({
      service: "drive",
      operation: "get-folder-parents",
      folder: child,
    });

    if (
      typeof parents !== "object" ||
      parents === null ||
      !("kind" in parents) ||
      parents.kind !== "folder-iterator"
    ) {
      throw new Error("expected parent folder iterator");
    }

    await expect(
      handler.handle({
        service: "drive",
        operation: "folder-iterator-next",
        iterator: parents,
      }),
    ).resolves.toStrictEqual(root);
  });
});
