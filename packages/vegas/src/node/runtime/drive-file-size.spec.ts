import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createBlob,
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

class FileSizeHostBridge implements HostBridge {
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
      case "create-file":
        return {
          service: "drive",
          kind: "file",
          id: "file-1",
        } as HostCallResult<C>;
      case "get-file-size":
        return 5 as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("Drive file size", () => {
  test("map file size calls to number host results", () => {
    const call = {
      service: "drive",
      operation: "get-file-size",
      file: {
        service: "drive",
        kind: "file",
        id: "file-1",
      },
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof call>>().toEqualTypeOf<number>();
  });

  test("expose File.getSize() through the host boundary", () => {
    const bridge = new FileSizeHostBridge();
    const file = createDriveApp(bridge)
      .getRootFolder()
      .createFile(createBlob("Vegas", "text/plain", "vegas.txt"));

    expect(file.getSize()).toBe(5);
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
          bytes: [86, 101, 103, 97, 115],
          contentType: "text/plain",
          name: "vegas.txt",
          googleType: false,
        },
      },
      {
        service: "drive",
        operation: "get-file-size",
        file: {
          service: "drive",
          kind: "file",
          id: "file-1",
        },
      },
    ]);
  });

  test("measure binary content and keep Google-type files at zero bytes", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const file = await store.createFile(USER, root, {
      bytes: [86, 101, 103, 97, 115],
      contentType: "text/plain",
      name: "vegas.txt",
      googleType: false,
    });
    const shortcut = await store.createShortcut(USER, root, file.id);

    await expect(store.getFileSize(USER, file)).resolves.toBe(5);
    await expect(store.getFileSize(USER, shortcut)).resolves.toBe(0);

    await store.setFileContent(USER, file, [65, 66]);

    await expect(store.getFileSize(USER, file)).resolves.toBe(2);
  });

  test("route File.getSize() through LocalDriveHostHandler", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const file = await store.createFile(USER, root, {
      bytes: [65, 66, 67],
      contentType: "text/plain",
      name: "abc.txt",
      googleType: false,
    });
    const iterators = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      handler.handle({
        service: "drive",
        operation: "get-file-size",
        file,
      }),
    ).resolves.toBe(3);
  });
});
