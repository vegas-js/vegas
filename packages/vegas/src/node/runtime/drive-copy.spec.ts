import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createBlob,
  createDriveApp,
  DriveFile,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  LocalDriveHostHandler,
  type DriveFileReference,
  type DriveHostCall,
  type DriveNamespace,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

const USER = { userKey: "user-a" } as const satisfies DriveNamespace;

class CopyHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  #nextCopyId = 0;

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "drive") {
      throw new Error("unexpected host service");
    }

    switch (call.operation) {
      case "get-root-folder":
        return { service: "drive", kind: "folder", id: "root" } as HostCallResult<C>;
      case "create-file":
        return { service: "drive", kind: "file", id: "source" } as HostCallResult<C>;
      case "copy-file":
        this.#nextCopyId += 1;
        return {
          service: "drive",
          kind: "file",
          id: `copy-${this.#nextCopyId}`,
        } as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

describe("Drive File.makeCopy()", () => {
  test("map copy-file host calls to File references", () => {
    const copyCall = {
      service: "drive",
      operation: "copy-file",
      file: { service: "drive", kind: "file", id: "source" },
      name: "copy.txt",
      destination: { service: "drive", kind: "folder", id: "destination" },
    } satisfies DriveHostCall;

    expectTypeOf<HostCallResult<typeof copyCall>>().toEqualTypeOf<DriveFileReference>();
  });

  test("support all documented makeCopy overloads through one host operation", () => {
    const bridge = new CopyHostBridge();
    const root = createDriveApp(bridge).getRootFolder();
    const source = root.createFile(createBlob("Vegas", "text/plain", "vegas.txt"));

    const copies = [
      source.makeCopy(),
      source.makeCopy(root),
      source.makeCopy("named.txt"),
      source.makeCopy("named-in-root.txt", root),
    ];

    for (const copy of copies) {
      expect(copy).toBeInstanceOf(DriveFile);
    }
    expect(copies.map((copy) => copy.getId())).toStrictEqual([
      "copy-1",
      "copy-2",
      "copy-3",
      "copy-4",
    ]);
    expect(bridge.calls.slice(2)).toStrictEqual([
      {
        service: "drive",
        operation: "copy-file",
        file: { service: "drive", kind: "file", id: "source" },
      },
      {
        service: "drive",
        operation: "copy-file",
        file: { service: "drive", kind: "file", id: "source" },
        destination: { service: "drive", kind: "folder", id: "root" },
      },
      {
        service: "drive",
        operation: "copy-file",
        file: { service: "drive", kind: "file", id: "source" },
        name: "named.txt",
      },
      {
        service: "drive",
        operation: "copy-file",
        file: { service: "drive", kind: "file", id: "source" },
        name: "named-in-root.txt",
        destination: { service: "drive", kind: "folder", id: "root" },
      },
    ]);
  });

  test("copy modeled file state while applying optional name and parent overrides", async () => {
    let now = 100;
    const store = new InMemoryDriveStore(() => now);
    const root = await store.getRootFolder(USER);
    const sourceParent = await store.createFolder(USER, root, "source");
    const destination = await store.createFolder(USER, root, "destination");
    const source = await store.createFile(USER, sourceParent, {
      bytes: [86, 101, 103, 97, 115],
      contentType: "text/plain",
      name: "vegas.txt",
      googleType: false,
    });

    await store.setFileDescription(USER, source, "source description");
    await store.setFileStarred(USER, source, true);
    await store.setFileTrashed(USER, source, true);
    now = 200;

    const inherited = await store.copyFile(USER, source);
    const overridden = await store.copyFile(USER, source, "copy.txt", destination);

    expect(inherited).not.toStrictEqual(source);
    await expect(store.getFileBlob(USER, inherited)).resolves.toStrictEqual({
      bytes: [86, 101, 103, 97, 115],
      contentType: "text/plain",
      name: "vegas.txt",
      googleType: false,
    });
    await expect(store.getFileMetadata(USER, inherited)).resolves.toStrictEqual({
      name: "vegas.txt",
      mimeType: "text/plain",
    });
    await expect(store.listFileParents(USER, inherited)).resolves.toStrictEqual([sourceParent]);
    await expect(store.getFileDescription(USER, inherited)).resolves.toBe("source description");
    await expect(store.isFileStarred(USER, inherited)).resolves.toBe(true);
    await expect(store.isFileTrashed(USER, inherited)).resolves.toBe(true);
    await expect(store.getFileDateCreated(USER, inherited)).resolves.toBe(200);
    await expect(store.getFileLastUpdated(USER, inherited)).resolves.toBe(200);

    await expect(store.getFileMetadata(USER, overridden)).resolves.toStrictEqual({
      name: "copy.txt",
      mimeType: "text/plain",
    });
    await expect(store.listFileParents(USER, overridden)).resolves.toStrictEqual([destination]);
    await store.setFileContent(USER, overridden, [67, 111, 112, 121]);
    await expect(store.getFileBlob(USER, source)).resolves.toStrictEqual({
      bytes: [86, 101, 103, 97, 115],
      contentType: "text/plain",
      name: "vegas.txt",
      googleType: false,
    });
  });

  test("route copy-file through the local Drive host handler", async () => {
    const store = new InMemoryDriveStore();
    const root = await store.getRootFolder(USER);
    const destination = await store.createFolder(USER, root, "destination");
    const source = await store.createFile(USER, root, {
      bytes: [65],
      contentType: "text/plain",
      name: "source.txt",
      googleType: false,
    });
    const iterators = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    await expect(
      handler.handle({
        service: "drive",
        operation: "copy-file",
        file: source,
        name: "copy.txt",
        destination,
      }),
    ).resolves.toMatchObject({ service: "drive", kind: "file" });

    const copies = await store.listFolderFiles(USER, destination);
    expect(copies).toHaveLength(1);
    await expect(store.getFileMetadata(USER, copies[0]!)).resolves.toStrictEqual({
      name: "copy.txt",
      mimeType: "text/plain",
    });
  });
});
