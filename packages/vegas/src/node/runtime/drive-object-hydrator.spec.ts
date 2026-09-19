import { describe, expect, test } from "vitest";

import {
  createDriveApp,
  DriveFile,
  DriveFileIterator,
  DriveFolder,
  DriveFolderIterator,
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
        };
      }
      case "get-file-parents":
      case "get-folder-folders": {
        return {
          service: "drive",
          kind: "folder-iterator",
          handle: "folders",
        };
      }
      case "get-folder-files": {
        return {
          service: "drive",
          kind: "file-iterator",
          handle: "files",
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
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  });
}

describe("Drive object hydration", () => {
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

    expect(bridge.calls).toStrictEqual([
      {
        service: "drive",
        operation: "get-file",
        id: "file-id",
      },
      {
        service: "drive",
        operation: "get-file-parents",
        file: {
          service: "drive",
          kind: "file",
          id: "file-id",
        },
      },
      {
        service: "drive",
        operation: "iterator-has-next",
        iterator: {
          service: "drive",
          kind: "folder-iterator",
          handle: "folders",
        },
      },
      {
        service: "drive",
        operation: "iterator-continuation-token",
        iterator: {
          service: "drive",
          kind: "folder-iterator",
          handle: "folders",
        },
      },
      {
        service: "drive",
        operation: "folder-iterator-next",
        iterator: {
          service: "drive",
          kind: "folder-iterator",
          handle: "folders",
        },
      },
      {
        service: "drive",
        operation: "get-folder-files",
        folder: {
          service: "drive",
          kind: "folder",
          id: "next:folders",
        },
      },
      {
        service: "drive",
        operation: "iterator-has-next",
        iterator: {
          service: "drive",
          kind: "file-iterator",
          handle: "files",
        },
      },
      {
        service: "drive",
        operation: "iterator-continuation-token",
        iterator: {
          service: "drive",
          kind: "file-iterator",
          handle: "files",
        },
      },
      {
        service: "drive",
        operation: "file-iterator-next",
        iterator: {
          service: "drive",
          kind: "file-iterator",
          handle: "files",
        },
      },
      {
        service: "drive",
        operation: "get-folder-folders",
        folder: {
          service: "drive",
          kind: "folder",
          id: "next:folders",
        },
      },
      {
        service: "drive",
        operation: "folder-iterator-next",
        iterator: {
          service: "drive",
          kind: "folder-iterator",
          handle: "folders",
        },
      },
    ]);
  });
});
