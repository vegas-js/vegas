import { describe, expect, test } from "vitest";

import { InMemoryDriveStore, type BlobValue, type DriveNamespace } from "./index";

const USER_A = { userKey: "user-a" } as const satisfies DriveNamespace;
const USER_B = { userKey: "user-b" } as const satisfies DriveNamespace;

function createBlobValue(bytes: number[] = [104, 101, 108, 108, 111]): BlobValue {
  return {
    bytes,
    contentType: "text/plain",
    name: "hello.txt",
    googleType: false,
  };
}

describe("local Drive file resources", () => {
  test("persist file content, metadata, and direct parent-child relationships", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER_A);
    const folder = await store.createFolder(USER_A, root, "documents");
    const sourceBytes = [104, 101, 108, 108, 111];
    const file = await store.createFile(USER_A, folder, createBlobValue(sourceBytes));

    sourceBytes[0] = 0;

    await expect(store.listFiles(USER_A)).resolves.toStrictEqual([file]);
    await expect(store.listFolderFiles(USER_A, root)).resolves.toStrictEqual([]);
    await expect(store.listFolderFiles(USER_A, folder)).resolves.toStrictEqual([file]);
    await expect(store.listFileParents(USER_A, file)).resolves.toStrictEqual([folder]);
    await expect(store.getFileMetadata(USER_A, file)).resolves.toStrictEqual({
      name: "hello.txt",
      mimeType: "text/plain",
    });
    await expect(store.getFileBlob(USER_A, file)).resolves.toStrictEqual(createBlobValue());
  });

  test("preserve unknown file metadata instead of inventing defaults", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER_A);
    const blob = {
      bytes: [65],
      contentType: null,
      name: null,
      googleType: false,
    } satisfies BlobValue;
    const file = await store.createFile(USER_A, root, blob);

    await expect(store.getFileMetadata(USER_A, file)).resolves.toStrictEqual({
      name: null,
      mimeType: null,
    });
    await expect(store.getFileBlob(USER_A, file)).resolves.toStrictEqual(blob);
  });

  test("persist file content mutations without changing metadata", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER_A);
    const file = await store.createFile(USER_A, root, createBlobValue());
    const replacement = [117, 112, 100, 97, 116, 101, 100];

    await store.setFileContent(USER_A, file, replacement);
    replacement[0] = 0;

    await expect(store.getFileBlob(USER_A, file)).resolves.toStrictEqual(
      createBlobValue([117, 112, 100, 97, 116, 101, 100]),
    );
    await expect(store.getFileMetadata(USER_A, file)).resolves.toStrictEqual({
      name: "hello.txt",
      mimeType: "text/plain",
    });
  });

  test("persist file name mutations without changing other metadata", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER_A);
    const file = await store.createFile(USER_A, root, createBlobValue());

    await store.setFileName(USER_A, file, "renamed.txt");

    await expect(store.getFileMetadata(USER_A, file)).resolves.toStrictEqual({
      name: "renamed.txt",
      mimeType: "text/plain",
    });
  });

  test("return BlobValue copies instead of exposing persistent byte state", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER_A);
    const file = await store.createFile(USER_A, root, createBlobValue());
    const first = await store.getFileBlob(USER_A, file);

    (first.bytes as number[])[0] = 0;

    await expect(store.getFileBlob(USER_A, file)).resolves.toStrictEqual(createBlobValue());
  });

  test("keep created files isolated to their user namespace", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER_A);
    const file = await store.createFile(USER_A, root, createBlobValue());

    await expect(store.getFile(USER_B, file.id)).rejects.toThrow(
      `Unknown local Drive file: ${file.id}`,
    );
    await expect(store.getFileBlob(USER_B, file)).rejects.toThrow(
      `Unknown local Drive file: ${file.id}`,
    );
    await expect(store.getFileMetadata(USER_B, file)).rejects.toThrow(
      `Unknown local Drive file: ${file.id}`,
    );
    await expect(store.setFileContent(USER_B, file, [65])).rejects.toThrow(
      `Unknown local Drive file: ${file.id}`,
    );
    await expect(store.setFileName(USER_B, file, "invalid.txt")).rejects.toThrow(
      `Unknown local Drive file: ${file.id}`,
    );
    await expect(store.createFile(USER_B, root, createBlobValue())).rejects.toThrow(
      `Unknown local Drive folder: ${root.id}`,
    );
    await expect(store.listFiles(USER_B)).resolves.toStrictEqual([]);
  });
});
