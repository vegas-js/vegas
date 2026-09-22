import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createDriveApp,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  LocalDriveHostHandler,
  type DriveHostCall,
  type DriveNamespace,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

const USER = { userKey: "user-a" } as const satisfies DriveNamespace;

class FolderSizeHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "drive") {
      throw new Error("unexpected host service");
    }

    switch (call.operation) {
      case "get-root-folder":
        return { service: "drive", kind: "folder", id: "root" } as HostCallResult<C>;
      case "get-folder-size":
        return 0 as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("Drive folder size", () => {
  test("map folder size calls to numeric host results", () => {
    const call = {
      service: "drive",
      operation: "get-folder-size",
      folder: { service: "drive", kind: "folder", id: "folder-1" },
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof call>>().toEqualTypeOf<number>();
  });

  test("expose Folder.getSize() through the host boundary", () => {
    const bridge = new FolderSizeHostBridge();
    const folder = createDriveApp(bridge).getRootFolder();

    expect(folder.getSize()).toBe(0);
    expect(bridge.calls).toStrictEqual([
      {
        service: "drive",
        operation: "get-root-folder",
      },
      {
        service: "drive",
        operation: "get-folder-size",
        folder: {
          service: "drive",
          kind: "folder",
          id: "root",
        },
      },
    ]);
  });

  test("treat local Drive folders as zero-byte metadata resources", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const folder = await store.createFolder(USER, root, "docs");

    await expect(store.getFolderSize(USER, root)).resolves.toBe(0);
    await expect(store.getFolderSize(USER, folder)).resolves.toBe(0);

    await expect(
      store.getFolderSize(USER, {
        service: "drive",
        kind: "folder",
        id: "missing",
      }),
    ).rejects.toThrow("Unknown local Drive folder: missing");
  });

  test("route Folder.getSize() through LocalDriveHostHandler", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const folder = await store.createFolder(USER, root, "docs");
    const iterators = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      handler.handle({
        service: "drive",
        operation: "get-folder-size",
        folder,
      }),
    ).resolves.toBe(0);
  });
});
