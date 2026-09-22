import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createDriveApp,
  DriveFolder,
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

class FolderMutationHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  #nextFolderId = 0;

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
        this.#nextFolderId += 1;
        return {
          service: "drive",
          kind: "folder",
          id: `folder-${this.#nextFolderId}`,
        } as HostCallResult<C>;
      case "set-folder-name":
      case "move-folder":
        return undefined as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("Drive folder mutations", () => {
  test("map folder mutation calls to void host results", () => {
    const setNameCall = {
      service: "drive",
      operation: "set-folder-name",
      folder: {
        service: "drive",
        kind: "folder",
        id: "folder-1",
      },
      name: "renamed",
    } satisfies DriveHostCall;
    const moveCall = {
      service: "drive",
      operation: "move-folder",
      folder: {
        service: "drive",
        kind: "folder",
        id: "folder-1",
      },
      destination: {
        service: "drive",
        kind: "folder",
        id: "folder-2",
      },
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof setNameCall>>().toEqualTypeOf<void>();
    expectTypeOf<HostCallResult<typeof moveCall>>().toEqualTypeOf<void>();
  });

  test("expose fluent Folder.setName() and Folder.moveTo()", () => {
    const bridge = new FolderMutationHostBridge();
    const root = createDriveApp(bridge).getRootFolder();
    const source = root.createFolder("source");
    const destination = root.createFolder("destination");

    expect(source).toBeInstanceOf(DriveFolder);
    expect(source.setName("renamed")).toBe(source);
    expect(source.moveTo(destination)).toBe(source);

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
        name: "source",
      },
      {
        service: "drive",
        operation: "create-folder",
        parent: {
          service: "drive",
          kind: "folder",
          id: "root",
        },
        name: "destination",
      },
      {
        service: "drive",
        operation: "set-folder-name",
        folder: {
          service: "drive",
          kind: "folder",
          id: "folder-1",
        },
        name: "renamed",
      },
      {
        service: "drive",
        operation: "move-folder",
        folder: {
          service: "drive",
          kind: "folder",
          id: "folder-1",
        },
        destination: {
          service: "drive",
          kind: "folder",
          id: "folder-2",
        },
      },
    ]);
  });

  test("persist folder rename and move while rejecting hierarchy cycles", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const source = await store.createFolder(USER, root, "source");
    const child = await store.createFolder(USER, source, "child");
    const destination = await store.createFolder(USER, root, "destination");

    await store.setFolderName(USER, source, "renamed");
    await store.moveFolder(USER, source, destination);

    await expect(store.getFolderName(USER, source)).resolves.toBe("renamed");
    await expect(store.listFolderParents(USER, source)).resolves.toStrictEqual([destination]);
    await expect(store.listFolderFolders(USER, destination)).resolves.toStrictEqual([source]);

    await expect(store.moveFolder(USER, root, destination)).rejects.toThrow(
      "Cannot move the local Drive root folder.",
    );
    await expect(store.moveFolder(USER, destination, child)).rejects.toThrow(
      `Cannot move local Drive folder into itself or its descendant: ${destination.id}`,
    );
    await expect(store.moveFolder(USER, source, source)).rejects.toThrow(
      `Cannot move local Drive folder into itself or its descendant: ${source.id}`,
    );
  });

  test("route folder mutations through LocalDriveHostHandler", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const source = await store.createFolder(USER, root, "source");
    const destination = await store.createFolder(USER, root, "destination");
    const iterators = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      handler.handle({
        service: "drive",
        operation: "set-folder-name",
        folder: source,
        name: "renamed",
      }),
    ).resolves.toBeUndefined();
    await expect(
      handler.handle({
        service: "drive",
        operation: "move-folder",
        folder: source,
        destination,
      }),
    ).resolves.toBeUndefined();

    await expect(store.getFolderName(USER, source)).resolves.toBe("renamed");
    await expect(store.listFolderParents(USER, source)).resolves.toStrictEqual([destination]);
  });
});
