import { describe, expect, test } from "vitest";

import {
  InMemoryDriveIteratorStore,
  LocalDriveHostHandler,
  type BlobValue,
  type DriveFileMetadata,
  type DriveFileReference,
  type DriveFolderReference,
  type DriveNamespace,
  type DriveStore,
} from "./index";

const FILE_A = { service: "drive", kind: "file", id: "file-a" } as const;
const FILE_B = { service: "drive", kind: "file", id: "file-b" } as const;
const FOLDER_A = { service: "drive", kind: "folder", id: "folder-a" } as const;
const ROOT = { service: "drive", kind: "folder", id: "root" } as const;
const USER = { userKey: "user-a" } as const satisfies DriveNamespace;

class RecordingDriveStore implements DriveStore {
  readonly calls: string[] = [];

  async createFile(
    namespace: DriveNamespace,
    parent: DriveFolderReference,
    blob: BlobValue,
  ): Promise<DriveFileReference> {
    this.calls.push(`createFile:${namespace.userKey}:${parent.id}:${blob.bytes.length}`);
    return FILE_A;
  }

  async createFolder(
    namespace: DriveNamespace,
    parent: DriveFolderReference,
    name: string,
  ): Promise<DriveFolderReference> {
    this.calls.push(`createFolder:${namespace.userKey}:${parent.id}:${name}`);
    return { service: "drive", kind: "folder", id: `created:${name}` };
  }

  async getFile(
    namespace: DriveNamespace,
    id: string,
    resourceKey?: string,
  ): Promise<DriveFileReference> {
    this.calls.push(`getFile:${namespace.userKey}:${id}:${resourceKey ?? ""}`);
    return { service: "drive", kind: "file", id, ...(resourceKey ? { resourceKey } : {}) };
  }

  async getFileBlob(namespace: DriveNamespace, file: DriveFileReference): Promise<BlobValue> {
    this.calls.push(`getFileBlob:${namespace.userKey}:${file.id}`);
    return {
      bytes: [65],
      contentType: "text/plain",
      name: "a.txt",
      googleType: false,
    };
  }

  async getFileMetadata(
    namespace: DriveNamespace,
    file: DriveFileReference,
  ): Promise<DriveFileMetadata> {
    this.calls.push(`getFileMetadata:${namespace.userKey}:${file.id}`);
    return {
      name: "a.txt",
      mimeType: "text/plain",
    };
  }

  async isFileTrashed(namespace: DriveNamespace, file: DriveFileReference): Promise<boolean> {
    this.calls.push(`isFileTrashed:${namespace.userKey}:${file.id}`);
    return false;
  }

  async setFileContent(
    namespace: DriveNamespace,
    file: DriveFileReference,
    bytes: readonly number[],
  ): Promise<void> {
    this.calls.push(`setFileContent:${namespace.userKey}:${file.id}:${bytes.length}`);
  }

  async setFileName(
    namespace: DriveNamespace,
    file: DriveFileReference,
    name: string,
  ): Promise<void> {
    this.calls.push(`setFileName:${namespace.userKey}:${file.id}:${name}`);
  }

  async setFileTrashed(
    namespace: DriveNamespace,
    file: DriveFileReference,
    trashed: boolean,
  ): Promise<void> {
    this.calls.push(`setFileTrashed:${namespace.userKey}:${file.id}:${trashed}`);
  }

  async moveFile(
    namespace: DriveNamespace,
    file: DriveFileReference,
    destination: DriveFolderReference,
  ): Promise<void> {
    this.calls.push(`moveFile:${namespace.userKey}:${file.id}:${destination.id}`);
  }

  async getFolder(
    namespace: DriveNamespace,
    id: string,
    resourceKey?: string,
  ): Promise<DriveFolderReference> {
    this.calls.push(`getFolder:${namespace.userKey}:${id}:${resourceKey ?? ""}`);
    return { service: "drive", kind: "folder", id, ...(resourceKey ? { resourceKey } : {}) };
  }

  async getFolderName(namespace: DriveNamespace, folder: DriveFolderReference): Promise<string> {
    this.calls.push(`getFolderName:${namespace.userKey}:${folder.id}`);
    return `name:${folder.id}`;
  }

  async isFolderTrashed(namespace: DriveNamespace, folder: DriveFolderReference): Promise<boolean> {
    this.calls.push(`isFolderTrashed:${namespace.userKey}:${folder.id}`);
    return false;
  }

  async setFolderTrashed(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
    trashed: boolean,
  ): Promise<void> {
    this.calls.push(`setFolderTrashed:${namespace.userKey}:${folder.id}:${trashed}`);
  }

  async getRootFolder(namespace: DriveNamespace): Promise<DriveFolderReference> {
    this.calls.push(`getRootFolder:${namespace.userKey}`);
    return ROOT;
  }

  async listFiles(namespace: DriveNamespace): Promise<readonly DriveFileReference[]> {
    this.calls.push(`listFiles:${namespace.userKey}`);
    return [FILE_A, FILE_B];
  }

  async listTrashedFiles(namespace: DriveNamespace): Promise<readonly DriveFileReference[]> {
    this.calls.push(`listTrashedFiles:${namespace.userKey}`);
    return [];
  }

  async listFolders(namespace: DriveNamespace): Promise<readonly DriveFolderReference[]> {
    this.calls.push(`listFolders:${namespace.userKey}`);
    return [FOLDER_A];
  }

  async listTrashedFolders(namespace: DriveNamespace): Promise<readonly DriveFolderReference[]> {
    this.calls.push(`listTrashedFolders:${namespace.userKey}`);
    return [];
  }

  async listFileParents(
    namespace: DriveNamespace,
    file: DriveFileReference,
  ): Promise<readonly DriveFolderReference[]> {
    this.calls.push(`listFileParents:${namespace.userKey}:${file.id}`);
    return [ROOT];
  }

  async listFolderFiles(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<readonly DriveFileReference[]> {
    this.calls.push(`listFolderFiles:${namespace.userKey}:${folder.id}`);
    return [FILE_B];
  }

  async listFolderFolders(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<readonly DriveFolderReference[]> {
    this.calls.push(`listFolderFolders:${namespace.userKey}:${folder.id}`);
    return [FOLDER_A];
  }

  async listFolderParents(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<readonly DriveFolderReference[]> {
    this.calls.push(`listFolderParents:${namespace.userKey}:${folder.id}`);
    return [ROOT];
  }
}

describe("LocalDriveHostHandler", () => {
  test("route resource lookups to persistent DriveStore state", async () => {
    const store = new RecordingDriveStore();
    const iteratorStore = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iteratorStore.createSession(USER));

    await expect(
      handler.handle({
        service: "drive",
        operation: "get-file",
        id: "file-a",
        resourceKey: "resource-key",
      }),
    ).resolves.toStrictEqual({
      service: "drive",
      kind: "file",
      id: "file-a",
      resourceKey: "resource-key",
    });
    await expect(
      handler.handle({ service: "drive", operation: "get-folder", id: "folder-a" }),
    ).resolves.toStrictEqual(FOLDER_A);
    await expect(
      handler.handle({ service: "drive", operation: "get-root-folder" }),
    ).resolves.toStrictEqual(ROOT);

    expect(store.calls).toStrictEqual([
      "getFile:user-a:file-a:resource-key",
      "getFolder:user-a:folder-a:",
      "getRootFolder:user-a",
    ]);
  });

  test("route file creation and BlobValue reads through persistent DriveStore state", async () => {
    const store = new RecordingDriveStore();
    const iteratorStore = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iteratorStore.createSession(USER));
    const blob = {
      bytes: [65],
      contentType: "text/plain",
      name: "a.txt",
      googleType: false,
    } satisfies BlobValue;

    await expect(
      handler.handle({
        service: "drive",
        operation: "create-file",
        parent: ROOT,
        blob,
      }),
    ).resolves.toStrictEqual(FILE_A);
    await expect(
      handler.handle({
        service: "drive",
        operation: "get-file-blob",
        file: FILE_A,
      }),
    ).resolves.toStrictEqual(blob);

    expect(store.calls).toStrictEqual(["createFile:user-a:root:1", "getFileBlob:user-a:file-a"]);
  });

  test("route collection operations through invocation-local iterator state", async () => {
    const store = new RecordingDriveStore();
    const iteratorStore = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iteratorStore.createSession(USER));

    const files = await handler.handle({ service: "drive", operation: "get-files" });

    if (
      typeof files !== "object" ||
      files === null ||
      !("kind" in files) ||
      files.kind !== "file-iterator"
    ) {
      throw new Error("expected file iterator reference");
    }

    await expect(
      handler.handle({ service: "drive", operation: "iterator-has-next", iterator: files }),
    ).resolves.toBe(true);
    await expect(
      handler.handle({ service: "drive", operation: "file-iterator-next", iterator: files }),
    ).resolves.toStrictEqual(FILE_A);

    const parents = await handler.handle({
      service: "drive",
      operation: "get-file-parents",
      file: FILE_A,
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
      handler.handle({ service: "drive", operation: "folder-iterator-next", iterator: parents }),
    ).resolves.toStrictEqual(ROOT);

    expect(store.calls).toStrictEqual(["listFiles:user-a", "listFileParents:user-a:file-a"]);
  });

  test("resume only through continuation state in a new invocation session", async () => {
    const store = new RecordingDriveStore();
    const iteratorStore = new InMemoryDriveIteratorStore();
    const firstHandler = new LocalDriveHostHandler(store, USER, iteratorStore.createSession(USER));
    const files = await firstHandler.handle({ service: "drive", operation: "get-files" });

    if (
      typeof files !== "object" ||
      files === null ||
      !("kind" in files) ||
      files.kind !== "file-iterator"
    ) {
      throw new Error("expected file iterator reference");
    }

    await firstHandler.handle({
      service: "drive",
      operation: "file-iterator-next",
      iterator: files,
    });
    const token = await firstHandler.handle({
      service: "drive",
      operation: "iterator-continuation-token",
      iterator: files,
    });

    if (typeof token !== "string") {
      throw new Error("expected continuation token");
    }

    const secondHandler = new LocalDriveHostHandler(store, USER, iteratorStore.createSession(USER));

    await expect(
      secondHandler.handle({ service: "drive", operation: "iterator-has-next", iterator: files }),
    ).rejects.toThrow("Unknown Drive file iterator handle");

    const resumed = await secondHandler.handle({
      service: "drive",
      operation: "continue-file-iterator",
      continuationToken: token,
    });

    if (
      typeof resumed !== "object" ||
      resumed === null ||
      !("kind" in resumed) ||
      resumed.kind !== "file-iterator"
    ) {
      throw new Error("expected resumed file iterator reference");
    }

    await expect(
      secondHandler.handle({
        service: "drive",
        operation: "file-iterator-next",
        iterator: resumed,
      }),
    ).resolves.toStrictEqual(FILE_B);
  });
});
