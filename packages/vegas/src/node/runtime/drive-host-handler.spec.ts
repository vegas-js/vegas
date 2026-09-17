import { describe, expect, test } from "vitest";

import {
  InMemoryDriveIteratorStore,
  LocalDriveHostHandler,
  type DriveFileReference,
  type DriveFolderReference,
  type DriveStore,
} from "./index";

const FILE_A = { service: "drive", kind: "file", id: "file-a" } as const;
const FILE_B = { service: "drive", kind: "file", id: "file-b" } as const;
const FOLDER_A = { service: "drive", kind: "folder", id: "folder-a" } as const;
const ROOT = { service: "drive", kind: "folder", id: "root" } as const;

class RecordingDriveStore implements DriveStore {
  readonly calls: string[] = [];

  async getFile(id: string, resourceKey?: string): Promise<DriveFileReference> {
    this.calls.push(`getFile:${id}:${resourceKey ?? ""}`);
    return { service: "drive", kind: "file", id, ...(resourceKey ? { resourceKey } : {}) };
  }

  async getFolder(id: string, resourceKey?: string): Promise<DriveFolderReference> {
    this.calls.push(`getFolder:${id}:${resourceKey ?? ""}`);
    return { service: "drive", kind: "folder", id, ...(resourceKey ? { resourceKey } : {}) };
  }

  async getRootFolder(): Promise<DriveFolderReference> {
    this.calls.push("getRootFolder");
    return ROOT;
  }

  async listFiles(): Promise<readonly DriveFileReference[]> {
    this.calls.push("listFiles");
    return [FILE_A, FILE_B];
  }

  async listFolders(): Promise<readonly DriveFolderReference[]> {
    this.calls.push("listFolders");
    return [FOLDER_A];
  }

  async listFileParents(file: DriveFileReference): Promise<readonly DriveFolderReference[]> {
    this.calls.push(`listFileParents:${file.id}`);
    return [ROOT];
  }

  async listFolderFiles(folder: DriveFolderReference): Promise<readonly DriveFileReference[]> {
    this.calls.push(`listFolderFiles:${folder.id}`);
    return [FILE_B];
  }

  async listFolderFolders(folder: DriveFolderReference): Promise<readonly DriveFolderReference[]> {
    this.calls.push(`listFolderFolders:${folder.id}`);
    return [FOLDER_A];
  }
}

describe("LocalDriveHostHandler", () => {
  test("route resource lookups to persistent DriveStore state", async () => {
    const store = new RecordingDriveStore();
    const iteratorStore = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, iteratorStore.createSession());

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
      "getFile:file-a:resource-key",
      "getFolder:folder-a:",
      "getRootFolder",
    ]);
  });

  test("route collection operations through invocation-local iterator state", async () => {
    const store = new RecordingDriveStore();
    const iteratorStore = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, iteratorStore.createSession());

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

    expect(store.calls).toStrictEqual(["listFiles", "listFileParents:file-a"]);
  });

  test("resume only through continuation state in a new invocation session", async () => {
    const store = new RecordingDriveStore();
    const iteratorStore = new InMemoryDriveIteratorStore();
    const firstHandler = new LocalDriveHostHandler(store, iteratorStore.createSession());
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

    const secondHandler = new LocalDriveHostHandler(store, iteratorStore.createSession());

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
