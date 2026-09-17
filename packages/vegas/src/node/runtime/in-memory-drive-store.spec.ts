import { describe, expect, test } from "vitest";

import { InMemoryDriveStore, type DriveNamespace } from "./index";

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

  test("start each local Drive with an empty root hierarchy", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER_A);

    await expect(store.listFiles(USER_A)).resolves.toStrictEqual([]);
    await expect(store.listFolders(USER_A)).resolves.toStrictEqual([]);
    await expect(store.listFolderFiles(USER_A, root)).resolves.toStrictEqual([]);
    await expect(store.listFolderFolders(USER_A, root)).resolves.toStrictEqual([]);
  });
});
