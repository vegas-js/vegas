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

class DescriptionHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #descriptions = new Map<string, string>();

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "drive") {
      throw new Error("unexpected host service");
    }

    switch (call.operation) {
      case "get-root-folder":
        return { service: "drive", kind: "folder", id: "root" } as HostCallResult<C>;
      case "create-file":
        return { service: "drive", kind: "file", id: "file-1" } as HostCallResult<C>;
      case "create-folder":
        return { service: "drive", kind: "folder", id: "folder-1" } as HostCallResult<C>;
      case "get-file-description":
        return (this.#descriptions.get(call.file.id) ?? null) as HostCallResult<C>;
      case "get-folder-description":
        return (this.#descriptions.get(call.folder.id) ?? null) as HostCallResult<C>;
      case "set-file-description":
        this.#descriptions.set(call.file.id, call.description);
        return undefined as HostCallResult<C>;
      case "set-folder-description":
        this.#descriptions.set(call.folder.id, call.description);
        return undefined as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("Drive descriptions", () => {
  test("map description calls to nullable strings and void mutations", () => {
    const getFileCall = {
      service: "drive",
      operation: "get-file-description",
      file: { service: "drive", kind: "file", id: "file-1" },
    } satisfies DriveHostCall;
    const getFolderCall = {
      service: "drive",
      operation: "get-folder-description",
      folder: { service: "drive", kind: "folder", id: "folder-1" },
    } satisfies DriveHostCall;
    const setFileCall = {
      service: "drive",
      operation: "set-file-description",
      file: getFileCall.file,
      description: "file description",
    } satisfies DriveHostCall;
    const setFolderCall = {
      service: "drive",
      operation: "set-folder-description",
      folder: getFolderCall.folder,
      description: "folder description",
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof getFileCall>>().toEqualTypeOf<string | null>();
    expectTypeOf<HostCallResult<typeof getFolderCall>>().toEqualTypeOf<string | null>();
    expectTypeOf<HostCallResult<typeof setFileCall>>().toEqualTypeOf<void>();
    expectTypeOf<HostCallResult<typeof setFolderCall>>().toEqualTypeOf<void>();
  });

  test("expose fluent description access through File and Folder", () => {
    const bridge = new DescriptionHostBridge();
    const root = createDriveApp(bridge).getRootFolder();
    const file = root.createFile(createBlob("Vegas", "text/plain", "vegas.txt"));
    const folder = root.createFolder("docs");

    expect(file.getDescription()).toBeNull();
    expect(folder.getDescription()).toBeNull();
    expect(file.setDescription("file description")).toBe(file);
    expect(folder.setDescription("folder description")).toBe(folder);
    expect(file.getDescription()).toBe("file description");
    expect(folder.getDescription()).toBe("folder description");
  });

  test("persist file and folder descriptions independently", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const file = await store.createFile(USER, root, {
      bytes: [86, 101, 103, 97, 115],
      contentType: "text/plain",
      name: "vegas.txt",
      googleType: false,
    });
    const folder = await store.createFolder(USER, root, "docs");
    const shortcut = await store.createShortcut(USER, root, file.id);

    await expect(store.getFileDescription(USER, file)).resolves.toBeNull();
    await expect(store.getFolderDescription(USER, folder)).resolves.toBeNull();
    await expect(store.getFileDescription(USER, shortcut)).resolves.toBeNull();

    await store.setFileDescription(USER, file, "file description");
    await store.setFolderDescription(USER, folder, "folder description");

    await expect(store.getFileDescription(USER, file)).resolves.toBe("file description");
    await expect(store.getFolderDescription(USER, folder)).resolves.toBe("folder description");
    await expect(store.getFileDescription(USER, shortcut)).resolves.toBeNull();
  });

  test("route descriptions through LocalDriveHostHandler", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const file = await store.createFile(USER, root, {
      bytes: [65],
      contentType: "text/plain",
      name: "a.txt",
      googleType: false,
    });
    const folder = await store.createFolder(USER, root, "docs");
    const iterators = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      handler.handle({
        service: "drive",
        operation: "set-file-description",
        file,
        description: "file description",
      }),
    ).resolves.toBeUndefined();
    await expect(
      handler.handle({
        service: "drive",
        operation: "set-folder-description",
        folder,
        description: "folder description",
      }),
    ).resolves.toBeUndefined();

    await expect(
      handler.handle({ service: "drive", operation: "get-file-description", file }),
    ).resolves.toBe("file description");
    await expect(
      handler.handle({ service: "drive", operation: "get-folder-description", folder }),
    ).resolves.toBe("folder description");
  });
});
