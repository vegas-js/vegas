import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createDriveApp,
  DriveFileIterator,
  DriveFolder,
  DriveFolderIterator,
  type DriveFolderReference,
  type DriveHostCall,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

class RecordingHostBridge implements HostBridge {
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
      case "create-folder":
        return {
          service: "drive",
          kind: "folder",
          id: `created:${call.name}`,
        } as HostCallResult<C>;
      case "get-folder-name":
        return `name:${call.folder.id}` as HostCallResult<C>;
      case "get-files-by-name":
        return {
          service: "drive",
          kind: "file-iterator",
          handle: `files:${call.folder?.id ?? "all"}:${call.name}`,
        } as HostCallResult<C>;
      case "get-files-by-type":
        return {
          service: "drive",
          kind: "file-iterator",
          handle: `files:${call.folder?.id ?? "all"}:${call.mimeType}`,
        } as HostCallResult<C>;
      case "get-folders-by-name":
        return {
          service: "drive",
          kind: "folder-iterator",
          handle: `folders:${call.folder?.id ?? "all"}:${call.name}`,
        } as HostCallResult<C>;
      case "get-folder-parents":
        return {
          service: "drive",
          kind: "folder-iterator",
          handle: `parents:${call.folder.id}`,
        } as HostCallResult<C>;
      case "iterator-has-next":
        return true as HostCallResult<C>;
      case "folder-iterator-next":
        return {
          service: "drive",
          kind: "folder",
          id: `next:${call.iterator.handle}`,
        } as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("DriveFolder Runtime object", () => {
  test("expose resource keys from Drive references without a host call", () => {
    const bridge = new RecordingHostBridge();
    const folder = new DriveFolder(
      bridge,
      {
        service: "drive",
        kind: "folder",
        id: "folder-1",
        resourceKey: "resource-key",
      },
      {
        hydrate() {
          throw new Error("unexpected Drive object hydration");
        },
      },
    );
    const folderWithoutResourceKey = new DriveFolder(
      bridge,
      {
        service: "drive",
        kind: "folder",
        id: "folder-2",
      },
      {
        hydrate() {
          throw new Error("unexpected Drive object hydration");
        },
      },
    );

    expect(folder.getResourceKey()).toBe("resource-key");
    expect(folderWithoutResourceKey.getResourceKey()).toBeNull();
    expect(bridge.calls).toStrictEqual([]);
  });

  test("map folder resource calls to operation-specific result types", () => {
    const createCall = {
      service: "drive",
      operation: "create-folder",
      parent: {
        service: "drive",
        kind: "folder",
        id: "root",
      },
      name: "child",
    } satisfies DriveHostCall;
    const nameCall = {
      service: "drive",
      operation: "get-folder-name",
      folder: {
        service: "drive",
        kind: "folder",
        id: "folder",
      },
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof createCall>>().toEqualTypeOf<DriveFolderReference>();
    expectTypeOf<HostCallResult<typeof nameCall>>().toEqualTypeOf<string>();
  });

  test("hydrate created folders and preserve parent traversal", () => {
    const bridge = new RecordingHostBridge();
    const root = createDriveApp(bridge).getRootFolder();
    const child = root.createFolder("child");

    expect(root).toBeInstanceOf(DriveFolder);
    expect(child).toBeInstanceOf(DriveFolder);
    expect(child.getId()).toBe("created:child");
    expect(child.getName()).toBe("name:created:child");

    const files = child.getFilesByName("report.txt");
    const typedFiles = child.getFilesByType("text/plain");
    const folders = child.getFoldersByName("nested");
    const parents = child.getParents();

    expect(files).toBeInstanceOf(DriveFileIterator);
    expect(typedFiles).toBeInstanceOf(DriveFileIterator);
    expect(folders).toBeInstanceOf(DriveFolderIterator);
    expect(parents).toBeInstanceOf(DriveFolderIterator);
    expect(parents.hasNext()).toBe(true);
    expect(parents.next()).toBeInstanceOf(DriveFolder);

    expect(bridge.calls).toStrictEqual([
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
      {
        service: "drive",
        operation: "get-folder-name",
        folder: {
          service: "drive",
          kind: "folder",
          id: "created:child",
        },
      },
      {
        service: "drive",
        operation: "get-files-by-name",
        folder: {
          service: "drive",
          kind: "folder",
          id: "created:child",
        },
        name: "report.txt",
      },
      {
        service: "drive",
        operation: "get-files-by-type",
        folder: {
          service: "drive",
          kind: "folder",
          id: "created:child",
        },
        mimeType: "text/plain",
      },
      {
        service: "drive",
        operation: "get-folders-by-name",
        folder: {
          service: "drive",
          kind: "folder",
          id: "created:child",
        },
        name: "nested",
      },
      {
        service: "drive",
        operation: "get-folder-parents",
        folder: {
          service: "drive",
          kind: "folder",
          id: "created:child",
        },
      },
      {
        service: "drive",
        operation: "iterator-has-next",
        iterator: {
          service: "drive",
          kind: "folder-iterator",
          handle: "parents:created:child",
        },
      },
      {
        service: "drive",
        operation: "folder-iterator-next",
        iterator: {
          service: "drive",
          kind: "folder-iterator",
          handle: "parents:created:child",
        },
      },
    ]);
  });
});
