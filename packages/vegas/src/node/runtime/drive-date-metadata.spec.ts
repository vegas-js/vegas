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

class DateMetadataHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];

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
      case "get-file-date-created":
        return 1_000 as HostCallResult<C>;
      case "get-file-last-updated":
        return 2_000 as HostCallResult<C>;
      case "get-folder-date-created":
        return 3_000 as HostCallResult<C>;
      case "get-folder-last-updated":
        return 4_000 as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("Drive date metadata", () => {
  test("map date metadata calls to epoch-millisecond host results", () => {
    const fileCreatedCall = {
      service: "drive",
      operation: "get-file-date-created",
      file: { service: "drive", kind: "file", id: "file-1" },
    } satisfies DriveHostCall;
    const fileUpdatedCall = {
      service: "drive",
      operation: "get-file-last-updated",
      file: fileCreatedCall.file,
    } satisfies DriveHostCall;
    const folderCreatedCall = {
      service: "drive",
      operation: "get-folder-date-created",
      folder: { service: "drive", kind: "folder", id: "folder-1" },
    } satisfies DriveHostCall;
    const folderUpdatedCall = {
      service: "drive",
      operation: "get-folder-last-updated",
      folder: folderCreatedCall.folder,
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof fileCreatedCall>>().toEqualTypeOf<number>();
    expectTypeOf<HostCallResult<typeof fileUpdatedCall>>().toEqualTypeOf<number>();
    expectTypeOf<HostCallResult<typeof folderCreatedCall>>().toEqualTypeOf<number>();
    expectTypeOf<HostCallResult<typeof folderUpdatedCall>>().toEqualTypeOf<number>();
  });

  test("hydrate Apps Script Date values at the Runtime object boundary", () => {
    const bridge = new DateMetadataHostBridge();
    const root = createDriveApp(bridge).getRootFolder();
    const file = root.createFile(createBlob("Vegas", "text/plain", "vegas.txt"));
    const folder = root.createFolder("docs");

    expectTypeOf(file.getDateCreated()).toEqualTypeOf<Date>();
    expectTypeOf(file.getLastUpdated()).toEqualTypeOf<Date>();
    expectTypeOf(folder.getDateCreated()).toEqualTypeOf<Date>();
    expectTypeOf(folder.getLastUpdated()).toEqualTypeOf<Date>();

    expect(file.getDateCreated()).toStrictEqual(new Date(1_000));
    expect(file.getLastUpdated()).toStrictEqual(new Date(2_000));
    expect(folder.getDateCreated()).toStrictEqual(new Date(3_000));
    expect(folder.getLastUpdated()).toStrictEqual(new Date(4_000));
  });

  test("track deterministic creation and direct modification times", async () => {
    let now = 1_000;
    const store = new InMemoryDriveStore(() => now);
    const root = await store.getRootFolder(USER);

    await expect(store.getFolderDateCreated(USER, root)).resolves.toBe(1_000);
    await expect(store.getFolderLastUpdated(USER, root)).resolves.toBe(1_000);

    now = 2_000;
    const file = await store.createFile(USER, root, {
      bytes: [86, 101, 103, 97, 115],
      contentType: "text/plain",
      name: "vegas.txt",
      googleType: false,
    });

    now = 3_000;
    const folder = await store.createFolder(USER, root, "docs");

    now = 3_500;
    const destination = await store.createFolder(USER, root, "archive");

    now = 4_000;
    const shortcut = await store.createShortcut(USER, root, file.id);

    await expect(store.getFileDateCreated(USER, file)).resolves.toBe(2_000);
    await expect(store.getFileLastUpdated(USER, file)).resolves.toBe(2_000);
    await expect(store.getFolderDateCreated(USER, folder)).resolves.toBe(3_000);
    await expect(store.getFolderLastUpdated(USER, folder)).resolves.toBe(3_000);
    await expect(store.getFileDateCreated(USER, shortcut)).resolves.toBe(4_000);
    await expect(store.getFileLastUpdated(USER, shortcut)).resolves.toBe(4_000);
    await expect(store.getFolderLastUpdated(USER, root)).resolves.toBe(1_000);

    now = 5_000;
    await store.setFileStarred(USER, file, true);
    now = 5_500;
    await store.setFolderStarred(USER, folder, true);

    await expect(store.getFileLastUpdated(USER, file)).resolves.toBe(2_000);
    await expect(store.getFolderLastUpdated(USER, folder)).resolves.toBe(3_000);

    now = 6_000;
    await store.setFileDescription(USER, file, "description");
    await expect(store.getFileLastUpdated(USER, file)).resolves.toBe(6_000);

    now = 7_000;
    await store.setFileContent(USER, file, [65, 66]);
    await expect(store.getFileLastUpdated(USER, file)).resolves.toBe(7_000);

    now = 8_000;
    await store.setFileName(USER, file, "renamed.txt");
    await expect(store.getFileLastUpdated(USER, file)).resolves.toBe(8_000);

    now = 9_000;
    await store.moveFile(USER, file, folder);
    await expect(store.getFileLastUpdated(USER, file)).resolves.toBe(9_000);

    now = 10_000;
    await store.setFileTrashed(USER, file, true);
    await expect(store.getFileLastUpdated(USER, file)).resolves.toBe(10_000);

    now = 11_000;
    await store.setFolderDescription(USER, folder, "description");
    await expect(store.getFolderLastUpdated(USER, folder)).resolves.toBe(11_000);

    now = 12_000;
    await store.setFolderName(USER, folder, "renamed");
    await expect(store.getFolderLastUpdated(USER, folder)).resolves.toBe(12_000);

    now = 13_000;
    await store.moveFolder(USER, folder, destination);
    await expect(store.getFolderLastUpdated(USER, folder)).resolves.toBe(13_000);

    now = 14_000;
    await store.setFolderTrashed(USER, folder, true);
    await expect(store.getFolderLastUpdated(USER, folder)).resolves.toBe(14_000);

    await expect(store.getFileDateCreated(USER, file)).resolves.toBe(2_000);
    await expect(store.getFolderDateCreated(USER, folder)).resolves.toBe(3_000);
    await expect(store.getFileLastUpdated(USER, shortcut)).resolves.toBe(4_000);
    await expect(store.getFileLastUpdated(USER, file)).resolves.toBe(10_000);
  });

  test("route date metadata through LocalDriveHostHandler", async () => {
    let now = 1_000;
    const store = new InMemoryDriveStore(() => now);
    const root = await store.getRootFolder(USER);

    now = 2_000;
    const file = await store.createFile(USER, root, {
      bytes: [65],
      contentType: "text/plain",
      name: "a.txt",
      googleType: false,
    });

    now = 3_000;
    const folder = await store.createFolder(USER, root, "docs");

    const iterators = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      handler.handle({ service: "drive", operation: "get-file-date-created", file }),
    ).resolves.toBe(2_000);
    await expect(
      handler.handle({ service: "drive", operation: "get-file-last-updated", file }),
    ).resolves.toBe(2_000);
    await expect(
      handler.handle({ service: "drive", operation: "get-folder-date-created", folder }),
    ).resolves.toBe(3_000);
    await expect(
      handler.handle({ service: "drive", operation: "get-folder-last-updated", folder }),
    ).resolves.toBe(3_000);
  });
});
