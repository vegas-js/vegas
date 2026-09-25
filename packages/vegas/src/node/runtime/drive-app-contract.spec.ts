import { describe, expect, test } from "vitest";

import {
  DriveFile,
  DriveFileIterator,
  DriveFolder,
  DriveFolderIterator,
  MIME_TYPE,
  createBlob,
  createDriveApp,
  type DriveFileIteratorReference,
  type DriveFileReference,
  type DriveFolderIteratorReference,
  type DriveFolderReference,
  type HostBridge,
  type HostCall,
  type HostCallResult,
  type RuntimeBlobSource,
} from "./index";

const ROOT = {
  service: "drive",
  kind: "folder",
  id: "root",
} as const satisfies DriveFolderReference;

const FILE = {
  service: "drive",
  kind: "file",
  id: "file-a",
} as const satisfies DriveFileReference;

const FOLDER = {
  service: "drive",
  kind: "folder",
  id: "folder-a",
} as const satisfies DriveFolderReference;

const FILE_ITERATOR = {
  service: "drive",
  kind: "file-iterator",
  handle: "file-iterator",
} as const satisfies DriveFileIteratorReference;

const FOLDER_ITERATOR = {
  service: "drive",
  kind: "folder-iterator",
  handle: "folder-iterator",
} as const satisfies DriveFolderIteratorReference;

class DriveAppContractBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "drive") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "get-root-folder":
        return ROOT as unknown as HostCallResult<C>;
      case "create-file":
      case "create-shortcut":
      case "get-file":
        return FILE as unknown as HostCallResult<C>;
      case "create-folder":
      case "get-folder":
        return FOLDER as unknown as HostCallResult<C>;
      case "get-files":
      case "get-trashed-files":
      case "get-files-by-name":
      case "get-files-by-type":
      case "continue-file-iterator":
        return FILE_ITERATOR as unknown as HostCallResult<C>;
      case "get-folders":
      case "get-trashed-folders":
      case "get-folders-by-name":
      case "continue-folder-iterator":
        return FOLDER_ITERATOR as unknown as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

// Public contract:
// https://developers.google.com/apps-script/reference/drive/drive-app
describe("DriveApp public contract", () => {
  test("create files, folders, and shortcuts in the root folder", () => {
    const bridge = new DriveAppContractBridge();
    const drive = createDriveApp(bridge);
    const sourceBlob = createBlob("source", "application/octet-stream", "source.bin");
    const source = {
      getBlob: () => sourceBlob,
    } satisfies RuntimeBlobSource;

    expect(drive.createFile(source)).toBeInstanceOf(DriveFile);
    expect(drive.createFile("notes.txt", "Vegas")).toBeInstanceOf(DriveFile);
    expect(drive.createFile("index.html", "<main>Vegas</main>", MIME_TYPE.HTML)).toBeInstanceOf(
      DriveFile,
    );
    expect(drive.createFolder("docs")).toBeInstanceOf(DriveFolder);
    expect(drive.createShortcut("target-id")).toBeInstanceOf(DriveFile);
    expect(
      drive.createShortcutForTargetIdAndResourceKey("target-id", "resource-key"),
    ).toBeInstanceOf(DriveFile);

    // HostBridge is Vegas's local substitute for Drive service state. These assertions verify that
    // the documented root-level creation APIs preserve their public inputs without modeling Drive.
    expect(bridge.calls[1]).toMatchObject({
      operation: "create-file",
      parent: ROOT,
      blob: {
        name: "source.bin",
        contentType: "application/octet-stream",
      },
    });
    expect(bridge.calls[3]).toMatchObject({
      operation: "create-file",
      parent: ROOT,
      blob: {
        name: "notes.txt",
        contentType: MIME_TYPE.PLAIN_TEXT,
      },
    });
    expect(bridge.calls[5]).toMatchObject({
      operation: "create-file",
      parent: ROOT,
      blob: {
        name: "index.html",
        contentType: MIME_TYPE.HTML,
      },
    });
    expect(bridge.calls[7]).toMatchObject({
      operation: "create-folder",
      parent: ROOT,
      name: "docs",
    });
    expect(bridge.calls[9]).toMatchObject({
      operation: "create-shortcut",
      parent: ROOT,
      targetId: "target-id",
    });
    expect(bridge.calls[11]).toMatchObject({
      operation: "create-shortcut",
      parent: ROOT,
      targetId: "target-id",
      targetResourceKey: "resource-key",
    });
  });

  test("resume file and folder iterators from continuation tokens", () => {
    const bridge = new DriveAppContractBridge();
    const drive = createDriveApp(bridge);

    expect(drive.continueFileIterator("file-token")).toBeInstanceOf(DriveFileIterator);
    expect(drive.continueFolderIterator("folder-token")).toBeInstanceOf(DriveFolderIterator);
    expect(bridge.calls).toMatchObject([
      {
        operation: "continue-file-iterator",
        continuationToken: "file-token",
      },
      {
        operation: "continue-folder-iterator",
        continuationToken: "folder-token",
      },
    ]);
  });

  test("find files by identity and return documented file collections", () => {
    const bridge = new DriveAppContractBridge();
    const drive = createDriveApp(bridge);

    expect(drive.getFileById("file-id")).toBeInstanceOf(DriveFile);
    expect(drive.getFileByIdAndResourceKey("file-id", "resource-key")).toBeInstanceOf(DriveFile);
    expect(drive.getFiles()).toBeInstanceOf(DriveFileIterator);
    expect(drive.getTrashedFiles()).toBeInstanceOf(DriveFileIterator);
    expect(drive.getFilesByName("notes.txt")).toBeInstanceOf(DriveFileIterator);
    expect(drive.getFilesByType(MIME_TYPE.PLAIN_TEXT)).toBeInstanceOf(DriveFileIterator);

    expect(bridge.calls).toMatchObject([
      {
        operation: "get-file",
        id: "file-id",
      },
      {
        operation: "get-file",
        id: "file-id",
        resourceKey: "resource-key",
      },
      {
        operation: "get-files",
      },
      {
        operation: "get-trashed-files",
      },
      {
        operation: "get-files-by-name",
        name: "notes.txt",
      },
      {
        operation: "get-files-by-type",
        mimeType: MIME_TYPE.PLAIN_TEXT,
      },
    ]);
  });

  test("find folders by identity and return documented folder collections", () => {
    const bridge = new DriveAppContractBridge();
    const drive = createDriveApp(bridge);

    expect(drive.getFolderById("folder-id")).toBeInstanceOf(DriveFolder);
    expect(drive.getFolderByIdAndResourceKey("folder-id", "resource-key")).toBeInstanceOf(
      DriveFolder,
    );
    expect(drive.getFolders()).toBeInstanceOf(DriveFolderIterator);
    expect(drive.getTrashedFolders()).toBeInstanceOf(DriveFolderIterator);
    expect(drive.getFoldersByName("docs")).toBeInstanceOf(DriveFolderIterator);
    expect(drive.getRootFolder()).toBeInstanceOf(DriveFolder);

    expect(bridge.calls).toMatchObject([
      {
        operation: "get-folder",
        id: "folder-id",
      },
      {
        operation: "get-folder",
        id: "folder-id",
        resourceKey: "resource-key",
      },
      {
        operation: "get-folders",
      },
      {
        operation: "get-trashed-folders",
      },
      {
        operation: "get-folders-by-name",
        name: "docs",
      },
      {
        operation: "get-root-folder",
      },
    ]);
  });
});
