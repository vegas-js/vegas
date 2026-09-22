import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createDriveApp,
  DriveFile,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  LocalDriveHostHandler,
  MIME_TYPE,
  type DriveFileReference,
  type DriveHostCall,
  type DriveNamespace,
  type DriveShortcutTarget,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

const USER = { userKey: "user-a" } as const satisfies DriveNamespace;

class ShortcutHostBridge implements HostBridge {
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
      case "create-shortcut":
        return {
          service: "drive",
          kind: "file",
          id: call.targetResourceKey === undefined ? "shortcut-file" : "shortcut-folder",
        } as HostCallResult<C>;
      case "get-file-shortcut-target":
        if (call.file.id === "shortcut-file") {
          return {
            id: "target-file",
            mimeType: "text/plain",
            resourceKey: null,
          } as HostCallResult<C>;
        }

        if (call.file.id === "shortcut-folder") {
          return {
            id: "target-folder",
            mimeType: MIME_TYPE.FOLDER,
            resourceKey: "target-key",
          } as HostCallResult<C>;
        }

        return null as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("Drive shortcuts", () => {
  test("map shortcut host calls to operation-specific result types", () => {
    const createCall = {
      service: "drive",
      operation: "create-shortcut",
      parent: {
        service: "drive",
        kind: "folder",
        id: "root",
      },
      targetId: "target-file",
    } satisfies DriveHostCall;
    const targetCall = {
      service: "drive",
      operation: "get-file-shortcut-target",
      file: {
        service: "drive",
        kind: "file",
        id: "shortcut-file",
      },
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof createCall>>().toEqualTypeOf<DriveFileReference>();
    expectTypeOf<HostCallResult<typeof targetCall>>().toEqualTypeOf<DriveShortcutTarget | null>();
  });

  test("expose DriveApp and Folder shortcut APIs through DriveFile", () => {
    const bridge = new ShortcutHostBridge();
    const drive = createDriveApp(bridge);

    const fileShortcut = drive.createShortcut("target-file");
    const folderShortcut = drive
      .getRootFolder()
      .createShortcutForTargetIdAndResourceKey("target-folder", "target-key");
    const regularFile = new DriveFile(
      bridge,
      {
        service: "drive",
        kind: "file",
        id: "regular-file",
      },
      {
        hydrate() {
          throw new Error("unexpected Drive object hydration");
        },
      },
    );

    expect(fileShortcut).toBeInstanceOf(DriveFile);
    expect(fileShortcut.getTargetId()).toBe("target-file");
    expect(fileShortcut.getTargetMimeType()).toBe("text/plain");
    expect(fileShortcut.getTargetResourceKey()).toBeNull();

    expect(folderShortcut.getTargetId()).toBe("target-folder");
    expect(folderShortcut.getTargetMimeType()).toBe(MIME_TYPE.FOLDER);
    expect(folderShortcut.getTargetResourceKey()).toBe("target-key");

    expect(regularFile.getTargetId()).toBeNull();
    expect(regularFile.getTargetMimeType()).toBeNull();
    expect(regularFile.getTargetResourceKey()).toBeNull();

    expect(bridge.calls).toStrictEqual([
      {
        service: "drive",
        operation: "get-root-folder",
      },
      {
        service: "drive",
        operation: "create-shortcut",
        parent: {
          service: "drive",
          kind: "folder",
          id: "root",
        },
        targetId: "target-file",
      },
      {
        service: "drive",
        operation: "get-root-folder",
      },
      {
        service: "drive",
        operation: "create-shortcut",
        parent: {
          service: "drive",
          kind: "folder",
          id: "root",
        },
        targetId: "target-folder",
        targetResourceKey: "target-key",
      },
      {
        service: "drive",
        operation: "get-file-shortcut-target",
        file: {
          service: "drive",
          kind: "file",
          id: "shortcut-file",
        },
      },
      {
        service: "drive",
        operation: "get-file-shortcut-target",
        file: {
          service: "drive",
          kind: "file",
          id: "shortcut-file",
        },
      },
      {
        service: "drive",
        operation: "get-file-shortcut-target",
        file: {
          service: "drive",
          kind: "file",
          id: "shortcut-file",
        },
      },
      {
        service: "drive",
        operation: "get-file-shortcut-target",
        file: {
          service: "drive",
          kind: "file",
          id: "shortcut-folder",
        },
      },
      {
        service: "drive",
        operation: "get-file-shortcut-target",
        file: {
          service: "drive",
          kind: "file",
          id: "shortcut-folder",
        },
      },
      {
        service: "drive",
        operation: "get-file-shortcut-target",
        file: {
          service: "drive",
          kind: "file",
          id: "shortcut-folder",
        },
      },
      {
        service: "drive",
        operation: "get-file-shortcut-target",
        file: {
          service: "drive",
          kind: "file",
          id: "regular-file",
        },
      },
      {
        service: "drive",
        operation: "get-file-shortcut-target",
        file: {
          service: "drive",
          kind: "file",
          id: "regular-file",
        },
      },
      {
        service: "drive",
        operation: "get-file-shortcut-target",
        file: {
          service: "drive",
          kind: "file",
          id: "regular-file",
        },
      },
    ]);
  });

  test("snapshot target metadata when creating local shortcuts", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const folder = await store.createFolder(USER, root, "Reports");
    const targetFile = await store.createFile(USER, root, {
      bytes: [86, 101, 103, 97, 115],
      contentType: "text/plain",
      name: "report.txt",
      googleType: false,
    });

    const fileShortcut = await store.createShortcut(USER, folder, targetFile.id);
    const folderShortcut = await store.createShortcut(USER, root, folder.id, "folder-key");

    await expect(store.getFileMetadata(USER, fileShortcut)).resolves.toStrictEqual({
      name: "report.txt",
      mimeType: MIME_TYPE.SHORTCUT,
    });
    await expect(store.getFileShortcutTarget(USER, fileShortcut)).resolves.toStrictEqual({
      id: targetFile.id,
      mimeType: "text/plain",
      resourceKey: null,
    });
    await expect(store.getFileMetadata(USER, folderShortcut)).resolves.toStrictEqual({
      name: "Reports",
      mimeType: MIME_TYPE.SHORTCUT,
    });
    await expect(store.getFileShortcutTarget(USER, folderShortcut)).resolves.toStrictEqual({
      id: folder.id,
      mimeType: MIME_TYPE.FOLDER,
      resourceKey: "folder-key",
    });
    await expect(store.listFolderFiles(USER, folder)).resolves.toStrictEqual([fileShortcut]);

    await store.setFileName(USER, targetFile, "renamed.txt");

    await expect(store.getFileMetadata(USER, fileShortcut)).resolves.toStrictEqual({
      name: "report.txt",
      mimeType: MIME_TYPE.SHORTCUT,
    });
    await expect(store.getFileShortcutTarget(USER, targetFile)).resolves.toBeNull();
  });

  test("route shortcut operations through LocalDriveHostHandler", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const target = await store.createFile(USER, root, {
      bytes: [65],
      contentType: "text/plain",
      name: "a.txt",
      googleType: false,
    });
    const iterators = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    const shortcut = await handler.handle({
      service: "drive",
      operation: "create-shortcut",
      parent: root,
      targetId: target.id,
      targetResourceKey: "target-key",
    });

    if (
      typeof shortcut !== "object" ||
      shortcut === null ||
      !("kind" in shortcut) ||
      shortcut.kind !== "file"
    ) {
      throw new Error("expected shortcut file reference");
    }

    await expect(
      handler.handle({
        service: "drive",
        operation: "get-file-shortcut-target",
        file: shortcut,
      }),
    ).resolves.toStrictEqual({
      id: target.id,
      mimeType: "text/plain",
      resourceKey: "target-key",
    });
  });
});
