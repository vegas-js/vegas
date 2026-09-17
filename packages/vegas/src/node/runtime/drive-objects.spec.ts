import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createDriveApp,
  DriveApp,
  DriveFile,
  DriveFileIterator,
  DriveFolder,
  DriveFolderIterator,
  type DriveFileReference,
  type DriveFolderReference,
  type DriveHostCall,
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
      case "get-files":
      case "get-folder-files": {
        return {
          service: "drive",
          kind: "file-iterator",
          handle: "files",
        };
      }
      case "get-folders":
      case "get-file-parents":
      case "get-folder-folders": {
        return {
          service: "drive",
          kind: "folder-iterator",
          handle: "folders",
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
      case "iterator-has-next": {
        return true;
      }
      case "iterator-continuation-token": {
        return `token:${call.iterator.handle}`;
      }
      case "file-iterator-next": {
        return {
          service: "drive",
          kind: "file",
          id: `next:${call.iterator.handle}`,
        };
      }
      case "folder-iterator-next": {
        return {
          service: "drive",
          kind: "folder",
          id: `next:${call.iterator.handle}`,
        };
      }
    }
  });
}

describe("Drive Runtime objects", () => {
  test("map Drive host calls to operation-specific result types", () => {
    const fileCall = {
      service: "drive",
      operation: "get-file",
      id: "file-id",
    } satisfies DriveHostCall;
    const hasNextCall = {
      service: "drive",
      operation: "iterator-has-next",
      iterator: {
        service: "drive",
        kind: "file-iterator",
        handle: "files",
      },
    } satisfies DriveHostCall;
    const tokenCall = {
      service: "drive",
      operation: "iterator-continuation-token",
      iterator: {
        service: "drive",
        kind: "folder-iterator",
        handle: "folders",
      },
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof fileCall>>().toEqualTypeOf<DriveFileReference>();
    expectTypeOf<HostCallResult<typeof hasNextCall>>().toEqualTypeOf<boolean>();
    expectTypeOf<HostCallResult<typeof tokenCall>>().toEqualTypeOf<string>();
  });

  test("hydrate DriveApp results into Runtime Class instances", () => {
    const bridge = createBridge();
    const drive = createDriveApp(bridge);

    expect(drive).toBeInstanceOf(DriveApp);

    const file = drive.getFileByIdAndResourceKey("file-id", "resource-key");
    const folder = drive.getFolderById("folder-id");
    const root = drive.getRootFolder();
    const files = drive.getFiles();
    const folders = drive.getFolders();
    const continuedFiles = drive.continueFileIterator("file-token");
    const continuedFolders = drive.continueFolderIterator("folder-token");

    expect(file).toBeInstanceOf(DriveFile);
    expect(file.getId()).toBe("file-id");
    expect(folder).toBeInstanceOf(DriveFolder);
    expect(folder.getId()).toBe("folder-id");
    expect(root).toBeInstanceOf(DriveFolder);
    expect(root.getId()).toBe("root");
    expect(files).toBeInstanceOf(DriveFileIterator);
    expect(folders).toBeInstanceOf(DriveFolderIterator);
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
        operation: "get-folders",
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

  test("preserve Class hydration through resource and iterator chains", () => {
    const bridge = createBridge();
    const drive = createDriveApp(bridge);

    const file = drive.getFileById("file-id");
    const parents = file.getParents();

    expect(parents).toBeInstanceOf(DriveFolderIterator);
    expect(parents.hasNext()).toBe(true);
    expect(parents.getContinuationToken()).toBe("token:folders");

    const parent = parents.next();

    expect(parent).toBeInstanceOf(DriveFolder);
    expect(parent.getId()).toBe("next:folders");

    const files = parent.getFiles();

    expect(files).toBeInstanceOf(DriveFileIterator);
    expect(files.hasNext()).toBe(true);
    expect(files.getContinuationToken()).toBe("token:files");

    const child = files.next();

    expect(child).toBeInstanceOf(DriveFile);
    expect(child.getId()).toBe("next:files");

    const folders = parent.getFolders();

    expect(folders).toBeInstanceOf(DriveFolderIterator);
    expect(folders.next()).toBeInstanceOf(DriveFolder);
  });
});
