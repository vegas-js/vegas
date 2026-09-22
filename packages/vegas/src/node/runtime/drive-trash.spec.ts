import { describe, expect, test } from "vitest";

import {
  createBlob,
  createDriveApp,
  DriveFileIterator,
  DriveFolderIterator,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  LocalDriveHostHandler,
  type DriveNamespace,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

const USER = { userKey: "user-a" } as const satisfies DriveNamespace;

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "drive") {
      throw new Error("unexpected host service");
    }

    switch (call.operation) {
      case "get-root-folder":
        return {
          service: "drive",
          kind: "folder",
          id: "root",
        } as HostCallResult<C>;
      case "create-file":
        return {
          service: "drive",
          kind: "file",
          id: "file-1",
        } as HostCallResult<C>;
      case "create-folder":
        return {
          service: "drive",
          kind: "folder",
          id: "folder-1",
        } as HostCallResult<C>;
      case "get-file-trashed":
      case "get-folder-trashed":
        return true as HostCallResult<C>;
      case "set-file-trashed":
      case "set-folder-trashed":
        return undefined as HostCallResult<C>;
      case "get-trashed-files":
        return {
          service: "drive",
          kind: "file-iterator",
          handle: "trashed-files",
        } as HostCallResult<C>;
      case "get-trashed-folders":
        return {
          service: "drive",
          kind: "folder-iterator",
          handle: "trashed-folders",
        } as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("Drive trash state", () => {
  test("expose trash operations through Drive Runtime objects", () => {
    const bridge = new RecordingHostBridge();
    const drive = createDriveApp(bridge);
    const root = drive.getRootFolder();
    const file = root.createFile(createBlob("Vegas", "text/plain", "vegas.txt"));
    const folder = root.createFolder("trash");

    expect(file.isTrashed()).toBe(true);
    expect(file.setTrashed(false)).toBe(file);
    expect(folder.isTrashed()).toBe(true);
    expect(folder.setTrashed(false)).toBe(folder);
    expect(drive.getTrashedFiles()).toBeInstanceOf(DriveFileIterator);
    expect(drive.getTrashedFolders()).toBeInstanceOf(DriveFolderIterator);

    expect(bridge.calls).toStrictEqual([
      {
        service: "drive",
        operation: "get-root-folder",
      },
      {
        service: "drive",
        operation: "create-file",
        parent: {
          service: "drive",
          kind: "folder",
          id: "root",
        },
        blob: {
          bytes: [86, 101, 103, 97, 115],
          contentType: "text/plain",
          name: "vegas.txt",
          googleType: false,
        },
      },
      {
        service: "drive",
        operation: "create-folder",
        parent: {
          service: "drive",
          kind: "folder",
          id: "root",
        },
        name: "trash",
      },
      {
        service: "drive",
        operation: "get-file-trashed",
        file: {
          service: "drive",
          kind: "file",
          id: "file-1",
        },
      },
      {
        service: "drive",
        operation: "set-file-trashed",
        file: {
          service: "drive",
          kind: "file",
          id: "file-1",
        },
        trashed: false,
      },
      {
        service: "drive",
        operation: "get-folder-trashed",
        folder: {
          service: "drive",
          kind: "folder",
          id: "folder-1",
        },
      },
      {
        service: "drive",
        operation: "set-folder-trashed",
        folder: {
          service: "drive",
          kind: "folder",
          id: "folder-1",
        },
        trashed: false,
      },
      {
        service: "drive",
        operation: "get-trashed-files",
      },
      {
        service: "drive",
        operation: "get-trashed-folders",
      },
    ]);
  });

  test("propagate effective trash state from parent folders", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const parent = await store.createFolder(USER, root, "parent");
    const child = await store.createFolder(USER, parent, "child");
    const file = await store.createFile(USER, child, {
      bytes: [86, 101, 103, 97, 115],
      contentType: "text/plain",
      name: "vegas.txt",
      googleType: false,
    });

    await expect(store.isFolderTrashed(USER, parent)).resolves.toBe(false);
    await expect(store.isFolderTrashed(USER, child)).resolves.toBe(false);
    await expect(store.isFileTrashed(USER, file)).resolves.toBe(false);

    await store.setFolderTrashed(USER, parent, true);

    await expect(store.isFolderTrashed(USER, parent)).resolves.toBe(true);
    await expect(store.isFolderTrashed(USER, child)).resolves.toBe(true);
    await expect(store.isFileTrashed(USER, file)).resolves.toBe(true);
    await expect(store.listFolders(USER)).resolves.toStrictEqual([]);
    await expect(store.listFiles(USER)).resolves.toStrictEqual([]);
    await expect(store.listTrashedFolders(USER)).resolves.toStrictEqual([parent, child]);
    await expect(store.listTrashedFiles(USER)).resolves.toStrictEqual([file]);

    await store.setFolderTrashed(USER, parent, false);
    await store.setFileTrashed(USER, file, true);

    await expect(store.isFolderTrashed(USER, child)).resolves.toBe(false);
    await expect(store.isFileTrashed(USER, file)).resolves.toBe(true);
    await expect(store.listFolders(USER)).resolves.toStrictEqual([parent, child]);
    await expect(store.listFiles(USER)).resolves.toStrictEqual([]);
  });

  test("route trashed collections through LocalDriveHostHandler iterators", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const folder = await store.createFolder(USER, root, "trash");
    const file = await store.createFile(USER, root, {
      bytes: [65],
      contentType: "text/plain",
      name: "a.txt",
      googleType: false,
    });

    await store.setFolderTrashed(USER, folder, true);
    await store.setFileTrashed(USER, file, true);

    const iterators = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      handler.handle({ service: "drive", operation: "get-file-trashed", file }),
    ).resolves.toBe(true);
    await expect(
      handler.handle({ service: "drive", operation: "get-folder-trashed", folder }),
    ).resolves.toBe(true);

    const files = await handler.handle({ service: "drive", operation: "get-trashed-files" });
    const folders = await handler.handle({ service: "drive", operation: "get-trashed-folders" });

    if (
      typeof files !== "object" ||
      files === null ||
      !("kind" in files) ||
      files.kind !== "file-iterator"
    ) {
      throw new Error("expected trashed file iterator");
    }

    if (
      typeof folders !== "object" ||
      folders === null ||
      !("kind" in folders) ||
      folders.kind !== "folder-iterator"
    ) {
      throw new Error("expected trashed folder iterator");
    }

    await expect(
      handler.handle({ service: "drive", operation: "file-iterator-next", iterator: files }),
    ).resolves.toStrictEqual(file);
    await expect(
      handler.handle({ service: "drive", operation: "folder-iterator-next", iterator: folders }),
    ).resolves.toStrictEqual(folder);

    await expect(
      handler.handle({
        service: "drive",
        operation: "set-file-trashed",
        file,
        trashed: false,
      }),
    ).resolves.toBeUndefined();
    await expect(
      handler.handle({
        service: "drive",
        operation: "set-folder-trashed",
        folder,
        trashed: false,
      }),
    ).resolves.toBeUndefined();

    await expect(store.isFileTrashed(USER, file)).resolves.toBe(false);
    await expect(store.isFolderTrashed(USER, folder)).resolves.toBe(false);
  });
});
