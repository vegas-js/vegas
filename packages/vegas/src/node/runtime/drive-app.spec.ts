import { describe, expect, test } from "vitest";

import {
  createBlob,
  createDriveApp,
  DriveApp,
  DriveFile,
  DriveFileIterator,
  DriveFolder,
  DriveFolderIterator,
  MIME_TYPE,
  type DriveFileReference,
  type DriveFolderReference,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #respond: (call: HostCall) => unknown;

  constructor(respond: (call: HostCall) => unknown) {
    this.#respond = respond;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);
    return this.#respond(call) as HostCallResult<C>;
  }
}

function createBridge() {
  return new RecordingHostBridge((call) => {
    if (call.service !== "drive") {
      throw new Error(`unexpected service: ${call.service}`);
    }

    switch (call.operation) {
      case "get-file": {
        return {
          service: "drive",
          kind: "file",
          id: call.id,
          ...(call.resourceKey === undefined ? {} : { resourceKey: call.resourceKey }),
        } satisfies DriveFileReference;
      }
      case "get-folder": {
        return {
          service: "drive",
          kind: "folder",
          id: call.id,
          ...(call.resourceKey === undefined ? {} : { resourceKey: call.resourceKey }),
        } satisfies DriveFolderReference;
      }
      case "get-root-folder": {
        return {
          service: "drive",
          kind: "folder",
          id: "root",
        };
      }
      case "create-file": {
        return {
          service: "drive",
          kind: "file",
          id: "created-file",
        };
      }
      case "create-folder": {
        return {
          service: "drive",
          kind: "folder",
          id: "created-folder",
        };
      }
      case "get-files": {
        return {
          service: "drive",
          kind: "file-iterator",
          handle: "files",
        };
      }
      case "get-files-by-name": {
        return {
          service: "drive",
          kind: "file-iterator",
          handle: `files:${call.name}`,
        };
      }
      case "get-files-by-type": {
        return {
          service: "drive",
          kind: "file-iterator",
          handle: `files:${call.mimeType}`,
        };
      }
      case "get-folders": {
        return {
          service: "drive",
          kind: "folder-iterator",
          handle: "folders",
        };
      }
      case "get-folders-by-name": {
        return {
          service: "drive",
          kind: "folder-iterator",
          handle: `folders:${call.name}`,
        };
      }
      case "continue-file-iterator": {
        return {
          service: "drive",
          kind: "file-iterator",
          handle: `continued:${call.continuationToken}`,
        };
      }
      case "continue-folder-iterator": {
        return {
          service: "drive",
          kind: "folder-iterator",
          handle: `continued:${call.continuationToken}`,
        };
      }
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  });
}

describe("DriveApp Runtime object", () => {
  test("hydrate results into Runtime Class instances", () => {
    const bridge = createBridge();
    const drive = createDriveApp(bridge);

    expect(drive).toBeInstanceOf(DriveApp);

    const file = drive.getFileByIdAndResourceKey("file-id", "resource-key");
    const folder = drive.getFolderById("folder-id");
    const root = drive.getRootFolder();
    const files = drive.getFiles();
    const namedFiles = drive.getFilesByName("report.txt");
    const typedFiles = drive.getFilesByType(MIME_TYPE.PLAIN_TEXT);
    const folders = drive.getFolders();
    const namedFolders = drive.getFoldersByName("Reports");
    const continuedFiles = drive.continueFileIterator("file-token");
    const continuedFolders = drive.continueFolderIterator("folder-token");

    expect(file).toBeInstanceOf(DriveFile);
    expect(file.getId()).toBe("file-id");
    expect(folder).toBeInstanceOf(DriveFolder);
    expect(folder.getId()).toBe("folder-id");
    expect(root).toBeInstanceOf(DriveFolder);
    expect(root.getId()).toBe("root");
    expect(files).toBeInstanceOf(DriveFileIterator);
    expect(namedFiles).toBeInstanceOf(DriveFileIterator);
    expect(typedFiles).toBeInstanceOf(DriveFileIterator);
    expect(folders).toBeInstanceOf(DriveFolderIterator);
    expect(namedFolders).toBeInstanceOf(DriveFolderIterator);
    expect(continuedFiles).toBeInstanceOf(DriveFileIterator);
    expect(continuedFolders).toBeInstanceOf(DriveFolderIterator);

    expect(bridge.calls).toStrictEqual([
      {
        service: "drive",
        operation: "get-file",
        id: "file-id",
        resourceKey: "resource-key",
      },
      {
        service: "drive",
        operation: "get-folder",
        id: "folder-id",
      },
      {
        service: "drive",
        operation: "get-root-folder",
      },
      {
        service: "drive",
        operation: "get-files",
      },
      {
        service: "drive",
        operation: "get-files-by-name",
        name: "report.txt",
      },
      {
        service: "drive",
        operation: "get-files-by-type",
        mimeType: "text/plain",
      },
      {
        service: "drive",
        operation: "get-folders",
      },
      {
        service: "drive",
        operation: "get-folders-by-name",
        name: "Reports",
      },
      {
        service: "drive",
        operation: "continue-file-iterator",
        continuationToken: "file-token",
      },
      {
        service: "drive",
        operation: "continue-folder-iterator",
        continuationToken: "folder-token",
      },
    ]);
  });

  test("create root resources through the existing root Folder path", () => {
    const bridge = createBridge();
    const drive = createDriveApp(bridge);
    const blob = createBlob("hello", "text/plain", "hello.txt");

    const file = drive.createFile(blob);
    const folder = drive.createFolder("child");

    expect(file).toBeInstanceOf(DriveFile);
    expect(file.getId()).toBe("created-file");
    expect(folder).toBeInstanceOf(DriveFolder);
    expect(folder.getId()).toBe("created-folder");
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
          bytes: [104, 101, 108, 108, 111],
          contentType: "text/plain",
          name: "hello.txt",
          googleType: false,
        },
      },
      {
        service: "drive",
        operation: "get-root-folder",
      },
      {
        service: "drive",
        operation: "create-folder",
        parent: {
          service: "drive",
          kind: "folder",
          id: "root",
        },
        name: "child",
      },
    ]);
  });
});
