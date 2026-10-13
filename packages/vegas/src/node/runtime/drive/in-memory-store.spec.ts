import { describe, expect, test } from "vitest";

import { InMemoryDriveStore, type DriveNamespace } from "../index";

const USER_A = { userKey: "user-a" } as const satisfies DriveNamespace;
const USER_B = { userKey: "user-b" } as const satisfies DriveNamespace;

describe("InMemoryDriveStore", () => {
  test("keep a stable root folder for each user namespace", async () => {
    const store = new InMemoryDriveStore();
    const first = await store.getRootFolder(USER_A);
    const sameUser = await store.getRootFolder(USER_A);
    const otherUser = await store.getRootFolder(USER_B);

    expect(sameUser).toStrictEqual(first);
    expect(otherUser.id).not.toBe(first.id);
    expect(first.id).not.toContain(USER_A.userKey);
    expect(otherUser.id).not.toContain(USER_B.userKey);
  });

  test("do not resolve resources across user namespaces", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER_A);

    await expect(store.getFolder(USER_A, root.id)).resolves.toStrictEqual(root);
    await expect(store.getFolder(USER_B, root.id)).rejects.toThrow(
      `Unknown local Drive folder: ${root.id}`,
    );
  });

  test("reject stale resource IDs after recreating the local Drive store", async () => {
    const previous = new InMemoryDriveStore();
    const oldRoot = await previous.getRootFolder(USER_A);
    const oldFolder = await previous.createFolder(USER_A, oldRoot, "old folder");
    const oldFile = await previous.createFile(USER_A, oldRoot, {
      bytes: [65],
      contentType: "text/plain",
      name: "old.txt",
      googleType: false,
    });

    const current = new InMemoryDriveStore();
    const newRoot = await current.getRootFolder(USER_A);
    const newFolder = await current.createFolder(USER_A, newRoot, "new folder");
    const newFile = await current.createFile(USER_A, newRoot, {
      bytes: [66],
      contentType: "text/plain",
      name: "new.txt",
      googleType: false,
    });

    expect(newRoot.id).not.toBe(oldRoot.id);
    expect(newFolder.id).not.toBe(oldFolder.id);
    expect(newFile.id).not.toBe(oldFile.id);
    await expect(current.getFolder(USER_A, oldRoot.id)).rejects.toThrow(
      `Unknown local Drive folder: ${oldRoot.id}`,
    );
    await expect(current.getFolder(USER_A, oldFolder.id)).rejects.toThrow(
      `Unknown local Drive folder: ${oldFolder.id}`,
    );
    await expect(current.getFile(USER_A, oldFile.id)).rejects.toThrow(
      `Unknown local Drive file: ${oldFile.id}`,
    );

    const copy = await current.copyFile(USER_A, newFile);
    const shortcut = await current.createShortcut(USER_A, newRoot, newFile.id);
    expect(new Set([newFile.id, copy.id, shortcut.id]).size).toBe(3);
  });

  test("start each local Drive with an empty root hierarchy", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER_A);

    await expect(store.listFiles(USER_A)).resolves.toStrictEqual([]);
    await expect(store.listFolders(USER_A)).resolves.toStrictEqual([]);
    await expect(store.listFolderFiles(USER_A, root)).resolves.toStrictEqual([]);
    await expect(store.listFolderFolders(USER_A, root)).resolves.toStrictEqual([]);
  });
});
