import { describe, expect, test } from "vitest";

import {
  InMemoryDriveIteratorStore,
  LocalDriveHostHandler,
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

  async getRootFolder(namespace: DriveNamespace): Promise<DriveFolderReference> {
    this.calls.push(`getRootFolder:${namespace.userKey}`);
    return ROOT;
  }

  async listFiles(namespace: DriveNamespace): Promise<readonly DriveFileReference[]> {
    this.calls.push(`listFiles:${namespace.userKey}`);
    return [FILE_A, FILE_B];
  }

  async listFolders(namespace: DriveNamespace): Promise<readonly DriveFolderReference[]> {
    this.calls.push(`listFolders:${namespace.userKey}`);
    return [FOLDER_A];
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

  test("route collection operations through invocation-local iterator state", async () => {
    const store = new RecordingDriveStore();
    const iteratorStore = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iteratorStore.createSession(USER));

    const files = await handler.handle({ service: "drive", operation: "get-files" });

    if (typeof files === "string" || typeof files === "boolean" || files.kind !== "file-iterator") {
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
      typeof parents === "string" ||
      typeof parents === "boolean" ||
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

    if (typeof files === "string" || typeof files === "boolean" || files.kind !== "file-iterator") {
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
      typeof resumed === "string" ||
      typeof resumed === "boolean" ||
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
