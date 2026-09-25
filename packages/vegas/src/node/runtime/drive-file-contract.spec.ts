import { describe, expect, test } from "vitest";

import {
  DriveFile,
  DriveFolderIterator,
  RuntimeBlob,
  createDriveObjectHydrator,
  type DriveFileReference,
  type DriveFolderIteratorReference,
  type DriveFolderReference,
  type DriveShortcutTarget,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

const FILE = {
  service: "drive",
  kind: "file",
  id: "file-a",
  resourceKey: "file-resource-key",
} as const satisfies DriveFileReference;

const UNKEYED_FILE = {
  service: "drive",
  kind: "file",
  id: "file-b",
} as const satisfies DriveFileReference;

const DESTINATION = {
  service: "drive",
  kind: "folder",
  id: "destination",
} as const satisfies DriveFolderReference;

const PARENTS = {
  service: "drive",
  kind: "folder-iterator",
  handle: "parents",
} as const satisfies DriveFolderIteratorReference;

const SHORTCUT_TARGET = {
  id: "target-id",
  mimeType: "application/pdf",
  resourceKey: "target-resource-key",
} as const satisfies DriveShortcutTarget;

class DriveFileContractBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #shortcutTarget: DriveShortcutTarget | null;

  constructor(shortcutTarget: DriveShortcutTarget | null = SHORTCUT_TARGET) {
    this.#shortcutTarget = shortcutTarget;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service === "blob") {
      return {
        ...call.value,
        bytes: [80, 68, 70],
        contentType: call.contentType,
      } as unknown as HostCallResult<C>;
    }

    if (call.service !== "drive") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "get-file-blob":
        return {
          bytes: [86, 101, 103, 97, 115],
          contentType: "text/plain",
          name: "vegas.txt",
          googleType: false,
        } as unknown as HostCallResult<C>;
      case "get-file-date-created":
        return 1_000 as unknown as HostCallResult<C>;
      case "get-file-description":
        return "description" as unknown as HostCallResult<C>;
      case "get-file-last-updated":
        return 2_000 as unknown as HostCallResult<C>;
      case "get-file-mime-type":
        return "text/plain" as unknown as HostCallResult<C>;
      case "get-file-name":
        return "vegas.txt" as unknown as HostCallResult<C>;
      case "get-file-size":
        return 5 as unknown as HostCallResult<C>;
      case "get-file-shortcut-target":
        return this.#shortcutTarget as unknown as HostCallResult<C>;
      case "get-file-parents":
        return PARENTS as unknown as HostCallResult<C>;
      case "get-file-starred":
        return true as unknown as HostCallResult<C>;
      case "get-file-trashed":
        return false as unknown as HostCallResult<C>;
      case "move-file":
      case "set-file-content":
      case "set-file-description":
      case "set-file-name":
      case "set-file-starred":
      case "set-file-trashed":
        return undefined as unknown as HostCallResult<C>;
      default:
        throw new Error(`unexpected Drive operation: ${call.operation}`);
    }
  }
}

// Public contract:
// https://developers.google.com/apps-script/reference/drive/file
describe("Drive File public contract", () => {
  test("expose Blob data, conversion, metadata, identity, and resource keys", () => {
    const bridge = new DriveFileContractBridge();
    const hydrator = createDriveObjectHydrator(bridge);
    const file = hydrator.hydrate(FILE);

    expect(file).toBeInstanceOf(DriveFile);
    expect(file.getId()).toBe("file-a");
    expect(file.getResourceKey()).toBe("file-resource-key");
    expect(hydrator.hydrate(UNKEYED_FILE).getResourceKey()).toBeNull();

    const blob = file.getBlob();

    expect(blob).toBeInstanceOf(RuntimeBlob);
    expect(blob.getDataAsString()).toBe("Vegas");
    expect(blob.getContentType()).toBe("text/plain");
    expect(blob.getName()).toBe("vegas.txt");

    const converted = file.getAs("application/pdf");

    expect(converted).toBeInstanceOf(RuntimeBlob);
    expect(converted.getBytes()).toStrictEqual([80, 68, 70]);
    expect(converted.getContentType()).toBe("application/pdf");

    expect(file.getDateCreated()).toStrictEqual(new Date(1_000));
    expect(file.getDescription()).toBe("description");
    expect(file.getLastUpdated()).toStrictEqual(new Date(2_000));
    expect(file.getMimeType()).toBe("text/plain");
    expect(file.getName()).toBe("vegas.txt");
    expect(file.getSize()).toBe(5);
  });

  test("expose shortcut targets and return null when no shortcut target exists", () => {
    const shortcut = createDriveObjectHydrator(new DriveFileContractBridge()).hydrate(FILE);

    expect(shortcut.getTargetId()).toBe("target-id");
    expect(shortcut.getTargetMimeType()).toBe("application/pdf");
    expect(shortcut.getTargetResourceKey()).toBe("target-resource-key");

    const ordinary = createDriveObjectHydrator(new DriveFileContractBridge(null)).hydrate(FILE);

    expect(ordinary.getTargetId()).toBeNull();
    expect(ordinary.getTargetMimeType()).toBeNull();
    expect(ordinary.getTargetResourceKey()).toBeNull();
  });

  test("expose parents, starred state, and trashed state", () => {
    const bridge = new DriveFileContractBridge();
    const file = createDriveObjectHydrator(bridge).hydrate(FILE);

    expect(file.getParents()).toBeInstanceOf(DriveFolderIterator);
    expect(file.isStarred()).toBe(true);
    expect(file.isTrashed()).toBe(false);
  });

  test("mutate documented file state with chaining", () => {
    const bridge = new DriveFileContractBridge();
    const hydrator = createDriveObjectHydrator(bridge);
    const file = hydrator.hydrate(FILE);
    const destination = hydrator.hydrate(DESTINATION);

    expect(file.moveTo(destination)).toBe(file);
    expect(file.setContent("updated")).toBe(file);
    expect(file.setDescription("updated description")).toBe(file);
    expect(file.setName("updated.txt")).toBe(file);
    expect(file.setStarred(false)).toBe(file);
    expect(file.setTrashed(true)).toBe(file);

    expect(bridge.calls).toMatchObject([
      {
        service: "drive",
        operation: "move-file",
        file: FILE,
        destination: DESTINATION,
      },
      {
        service: "drive",
        operation: "set-file-content",
        file: FILE,
        content: "updated",
      },
      {
        service: "drive",
        operation: "set-file-description",
        file: FILE,
        description: "updated description",
      },
      {
        service: "drive",
        operation: "set-file-name",
        file: FILE,
        name: "updated.txt",
      },
      {
        service: "drive",
        operation: "set-file-starred",
        file: FILE,
        starred: false,
      },
      {
        service: "drive",
        operation: "set-file-trashed",
        file: FILE,
        trashed: true,
      },
    ]);
  });
});
