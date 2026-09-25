import { describe, expect, test } from "vitest";

import {
  DriveFile,
  DriveFileIterator,
  DriveFolder,
  DriveFolderIterator,
  MIME_TYPE,
  createBlob,
  createDriveObjectHydrator,
  type DriveFileIteratorReference,
  type DriveFileReference,
  type DriveFolderIteratorReference,
  type DriveFolderReference,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type RuntimeBlobSource,
} from "./index";

const FOLDER = {
  service: "drive",
  kind: "folder",
  id: "folder-a",
  resourceKey: "folder-resource-key",
} as const satisfies DriveFolderReference;

const UNKEYED_FOLDER = {
  service: "drive",
  kind: "folder",
  id: "folder-b",
} as const satisfies DriveFolderReference;

const CREATED_FOLDER = {
  service: "drive",
  kind: "folder",
  id: "created-folder",
} as const satisfies DriveFolderReference;

const DESTINATION = {
  service: "drive",
  kind: "folder",
  id: "destination",
} as const satisfies DriveFolderReference;

const FILE = {
  service: "drive",
  kind: "file",
  id: "file-a",
} as const satisfies DriveFileReference;

const FILE_ITERATOR = {
  service: "drive",
  kind: "file-iterator",
  handle: "files",
} as const satisfies DriveFileIteratorReference;

const FOLDER_ITERATOR = {
  service: "drive",
  kind: "folder-iterator",
  handle: "folders",
} as const satisfies DriveFolderIteratorReference;

class DriveFolderContractBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "drive") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "create-file":
      case "create-shortcut":
        return FILE as unknown as HostCallResult<C>;
      case "create-folder":
        return CREATED_FOLDER as unknown as HostCallResult<C>;
      case "get-folder-files":
      case "get-files-by-name":
      case "get-files-by-type":
        return FILE_ITERATOR as unknown as HostCallResult<C>;
      case "get-folder-folders":
      case "get-folders-by-name":
      case "get-folder-parents":
        return FOLDER_ITERATOR as unknown as HostCallResult<C>;
      case "get-folder-date-created":
        return 1_000 as unknown as HostCallResult<C>;
      case "get-folder-description":
        return "description" as unknown as HostCallResult<C>;
      case "get-folder-last-updated":
        return 2_000 as unknown as HostCallResult<C>;
      case "get-folder-name":
        return "docs" as unknown as HostCallResult<C>;
      case "get-folder-size":
        return 42 as unknown as HostCallResult<C>;
      case "get-folder-starred":
        return true as unknown as HostCallResult<C>;
      case "get-folder-trashed":
        return false as unknown as HostCallResult<C>;
      case "move-folder":
      case "set-folder-description":
      case "set-folder-name":
      case "set-folder-starred":
      case "set-folder-trashed":
        return undefined as unknown as HostCallResult<C>;
      default:
        throw new Error("unexpected Drive operation");
    }
  }
}

// Public contract:
// https://developers.google.com/apps-script/reference/drive/folder
describe("Drive Folder public contract", () => {
  test("create files, folders, and shortcuts as children of the folder", () => {
    const bridge = new DriveFolderContractBridge();
    const hydrator = createDriveObjectHydrator(bridge);
    const folder = hydrator.hydrate(FOLDER);
    const blob = createBlob("source", "application/octet-stream", "source.bin");
    const source = {
      getBlob: () => blob,
    } satisfies RuntimeBlobSource;

    expect(folder.createFile(source)).toBeInstanceOf(DriveFile);
    expect(folder.createFile("notes.txt", "Vegas")).toBeInstanceOf(DriveFile);
    expect(folder.createFile("index.html", "<main>Vegas</main>", MIME_TYPE.HTML)).toBeInstanceOf(
      DriveFile,
    );
    expect(folder.createFolder("nested")).toBeInstanceOf(DriveFolder);
    expect(folder.createShortcut("target-id")).toBeInstanceOf(DriveFile);
    expect(
      folder.createShortcutForTargetIdAndResourceKey("target-id", "target-resource-key"),
    ).toBeInstanceOf(DriveFile);

    expect(bridge.calls).toMatchObject([
      {
        operation: "create-file",
        parent: FOLDER,
        blob: {
          name: "source.bin",
          contentType: "application/octet-stream",
        },
      },
      {
        operation: "create-file",
        parent: FOLDER,
        blob: {
          name: "notes.txt",
          contentType: MIME_TYPE.PLAIN_TEXT,
        },
      },
      {
        operation: "create-file",
        parent: FOLDER,
        blob: {
          name: "index.html",
          contentType: MIME_TYPE.HTML,
        },
      },
      {
        operation: "create-folder",
        parent: FOLDER,
        name: "nested",
      },
      {
        operation: "create-shortcut",
        parent: FOLDER,
        targetId: "target-id",
      },
      {
        operation: "create-shortcut",
        parent: FOLDER,
        targetId: "target-id",
        targetResourceKey: "target-resource-key",
      },
    ]);
  });

  test("return documented child file and folder collections", () => {
    const bridge = new DriveFolderContractBridge();
    const folder = createDriveObjectHydrator(bridge).hydrate(FOLDER);

    expect(folder.getFiles()).toBeInstanceOf(DriveFileIterator);
    expect(folder.getFilesByName("notes.txt")).toBeInstanceOf(DriveFileIterator);
    expect(folder.getFilesByType(MIME_TYPE.PLAIN_TEXT)).toBeInstanceOf(DriveFileIterator);
    expect(folder.getFolders()).toBeInstanceOf(DriveFolderIterator);
    expect(folder.getFoldersByName("nested")).toBeInstanceOf(DriveFolderIterator);

    expect(bridge.calls).toMatchObject([
      {
        operation: "get-folder-files",
        folder: FOLDER,
      },
      {
        operation: "get-files-by-name",
        folder: FOLDER,
        name: "notes.txt",
      },
      {
        operation: "get-files-by-type",
        folder: FOLDER,
        mimeType: MIME_TYPE.PLAIN_TEXT,
      },
      {
        operation: "get-folder-folders",
        folder: FOLDER,
      },
      {
        operation: "get-folders-by-name",
        folder: FOLDER,
        name: "nested",
      },
    ]);
  });

  test("expose metadata, identity, resource keys, and state", () => {
    const bridge = new DriveFolderContractBridge();
    const hydrator = createDriveObjectHydrator(bridge);
    const folder = hydrator.hydrate(FOLDER);

    expect(folder.getDateCreated()).toStrictEqual(new Date(1_000));
    expect(folder.getDescription()).toBe("description");
    expect(folder.getId()).toBe("folder-a");
    expect(folder.getLastUpdated()).toStrictEqual(new Date(2_000));
    expect(folder.getName()).toBe("docs");
    expect(folder.getResourceKey()).toBe("folder-resource-key");
    expect(hydrator.hydrate(UNKEYED_FOLDER).getResourceKey()).toBeNull();
    expect(folder.getSize()).toBe(42);
    expect(folder.isStarred()).toBe(true);
    expect(folder.isTrashed()).toBe(false);
    expect(folder.getParents()).toBeInstanceOf(DriveFolderIterator);
  });

  test("mutate documented folder state with chaining", () => {
    const bridge = new DriveFolderContractBridge();
    const hydrator = createDriveObjectHydrator(bridge);
    const folder = hydrator.hydrate(FOLDER);
    const destination = hydrator.hydrate(DESTINATION);

    expect(folder.moveTo(destination)).toBe(folder);
    expect(folder.setDescription("updated description")).toBe(folder);
    expect(folder.setName("updated")).toBe(folder);
    expect(folder.setStarred(false)).toBe(folder);
    expect(folder.setTrashed(true)).toBe(folder);

    expect(bridge.calls).toMatchObject([
      {
        operation: "move-folder",
        folder: FOLDER,
        destination: DESTINATION,
      },
      {
        operation: "set-folder-description",
        folder: FOLDER,
        description: "updated description",
      },
      {
        operation: "set-folder-name",
        folder: FOLDER,
        name: "updated",
      },
      {
        operation: "set-folder-starred",
        folder: FOLDER,
        starred: false,
      },
      {
        operation: "set-folder-trashed",
        folder: FOLDER,
        trashed: true,
      },
    ]);
  });
});
