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

class StarredHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #starred = new Map<string, boolean>();

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
      case "get-file-starred":
        return (this.#starred.get(call.file.id) ?? false) as HostCallResult<C>;
      case "get-folder-starred":
        return (this.#starred.get(call.folder.id) ?? false) as HostCallResult<C>;
      case "set-file-starred":
        this.#starred.set(call.file.id, call.starred);
        return undefined as HostCallResult<C>;
      case "set-folder-starred":
        this.#starred.set(call.folder.id, call.starred);
        return undefined as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("Drive starred state", () => {
  test("map starred calls to booleans and void mutations", () => {
    const getFileCall = {
      service: "drive",
      operation: "get-file-starred",
      file: { service: "drive", kind: "file", id: "file-1" },
    } satisfies DriveHostCall;
    const getFolderCall = {
      service: "drive",
      operation: "get-folder-starred",
      folder: { service: "drive", kind: "folder", id: "folder-1" },
    } satisfies DriveHostCall;
    const setFileCall = {
      service: "drive",
      operation: "set-file-starred",
      file: getFileCall.file,
      starred: true,
    } satisfies DriveHostCall;
    const setFolderCall = {
      service: "drive",
      operation: "set-folder-starred",
      folder: getFolderCall.folder,
      starred: true,
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof getFileCall>>().toEqualTypeOf<boolean>();
    expectTypeOf<HostCallResult<typeof getFolderCall>>().toEqualTypeOf<boolean>();
    expectTypeOf<HostCallResult<typeof setFileCall>>().toEqualTypeOf<void>();
    expectTypeOf<HostCallResult<typeof setFolderCall>>().toEqualTypeOf<void>();
  });

  test("expose fluent starred state through File and Folder", () => {
    const bridge = new StarredHostBridge();
    const root = createDriveApp(bridge).getRootFolder();
    const file = root.createFile(createBlob("Vegas", "text/plain", "vegas.txt"));
    const folder = root.createFolder("docs");

    expect(file.isStarred()).toBe(false);
    expect(folder.isStarred()).toBe(false);
    expect(file.setStarred(true)).toBe(file);
    expect(folder.setStarred(true)).toBe(folder);
    expect(file.isStarred()).toBe(true);
    expect(folder.isStarred()).toBe(true);
  });

  test("persist starred state independently for files, folders, and shortcuts", async () => {
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

    await expect(store.isFileStarred(USER, file)).resolves.toBe(false);
    await expect(store.isFolderStarred(USER, folder)).resolves.toBe(false);
    await expect(store.isFileStarred(USER, shortcut)).resolves.toBe(false);

    await store.setFileStarred(USER, file, true);
    await store.setFolderStarred(USER, folder, true);
    await store.setFileStarred(USER, shortcut, true);

    await expect(store.isFileStarred(USER, file)).resolves.toBe(true);
    await expect(store.isFolderStarred(USER, folder)).resolves.toBe(true);
    await expect(store.isFileStarred(USER, shortcut)).resolves.toBe(true);

    await store.setFileStarred(USER, file, false);
    await expect(store.isFileStarred(USER, file)).resolves.toBe(false);
    await expect(store.isFileStarred(USER, shortcut)).resolves.toBe(true);
  });

  test("route starred state through LocalDriveHostHandler", async () => {
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
        operation: "set-file-starred",
        file,
        starred: true,
      }),
    ).resolves.toBeUndefined();
    await expect(
      handler.handle({
        service: "drive",
        operation: "set-folder-starred",
        folder,
        starred: true,
      }),
    ).resolves.toBeUndefined();

    await expect(
      handler.handle({ service: "drive", operation: "get-file-starred", file }),
    ).resolves.toBe(true);
    await expect(
      handler.handle({ service: "drive", operation: "get-folder-starred", folder }),
    ).resolves.toBe(true);
  });
});
