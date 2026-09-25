import { describe, expect, test } from "vitest";

import {
  DriveFile,
  DriveFileIterator,
  DriveFolder,
  DriveFolderIterator,
  createDriveObjectHydrator,
  type DriveFileIteratorReference,
  type DriveFileReference,
  type DriveFolderIteratorReference,
  type DriveFolderReference,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

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

class IteratorContractBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "drive") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "iterator-continuation-token":
        return (call.iterator.kind === "file-iterator"
          ? "file-token"
          : "folder-token") as unknown as HostCallResult<C>;
      case "iterator-has-next":
        return true as unknown as HostCallResult<C>;
      case "file-iterator-next":
        return FILE as unknown as HostCallResult<C>;
      case "folder-iterator-next":
        return FOLDER as unknown as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

// Public contracts:
// https://developers.google.com/apps-script/reference/drive/file-iterator
// https://developers.google.com/apps-script/reference/drive/folder-iterator
describe("Drive iterator public contracts", () => {
  test("expose file iterator progress, continuation tokens, and File values", () => {
    const bridge = new IteratorContractBridge();
    const iterator = createDriveObjectHydrator(bridge).hydrate(FILE_ITERATOR);

    expect(iterator).toBeInstanceOf(DriveFileIterator);
    expect(iterator.hasNext()).toBe(true);
    expect(iterator.getContinuationToken()).toBe("file-token");

    const file = iterator.next();

    expect(file).toBeInstanceOf(DriveFile);
    expect(file.getId()).toBe("file-a");
    expect(bridge.calls.map((call) => call.operation)).toStrictEqual([
      "iterator-has-next",
      "iterator-continuation-token",
      "file-iterator-next",
    ]);
  });

  test("expose folder iterator progress, continuation tokens, and Folder values", () => {
    const bridge = new IteratorContractBridge();
    const iterator = createDriveObjectHydrator(bridge).hydrate(FOLDER_ITERATOR);

    expect(iterator).toBeInstanceOf(DriveFolderIterator);
    expect(iterator.hasNext()).toBe(true);
    expect(iterator.getContinuationToken()).toBe("folder-token");

    const folder = iterator.next();

    expect(folder).toBeInstanceOf(DriveFolder);
    expect(folder.getId()).toBe("folder-a");
    expect(bridge.calls.map((call) => call.operation)).toStrictEqual([
      "iterator-has-next",
      "iterator-continuation-token",
      "folder-iterator-next",
    ]);
  });
});
