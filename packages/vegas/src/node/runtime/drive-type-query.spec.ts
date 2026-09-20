import { describe, expect, test } from "vitest";

import {
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  LocalDriveHostHandler,
  type DriveFileIteratorReference,
  type DriveFileReference,
  type DriveFolderReference,
} from "./index";

const USER = { userKey: "user-a" } as const;

function requireFileIterator(value: unknown): DriveFileIteratorReference {
  if (
    typeof value !== "object" ||
    value === null ||
    !("kind" in value) ||
    value.kind !== "file-iterator"
  ) {
    throw new Error("expected Drive file iterator");
  }

  return value as DriveFileIteratorReference;
}

function requireFile(value: unknown): DriveFileReference {
  if (typeof value !== "object" || value === null || !("kind" in value) || value.kind !== "file") {
    throw new Error("expected Drive file");
  }

  return value as DriveFileReference;
}

function requireFolder(value: unknown): DriveFolderReference {
  if (
    typeof value !== "object" ||
    value === null ||
    !("kind" in value) ||
    value.kind !== "folder"
  ) {
    throw new Error("expected Drive folder");
  }

  return value as DriveFolderReference;
}

describe("local Drive MIME type queries", () => {
  test("filter Drive-wide and folder-scoped file iterators by exact MIME type", async () => {
    const store = new InMemoryDriveStore();
    const iterators = new InMemoryDriveIteratorStore();
    const handler = new LocalDriveHostHandler(store, USER, iterators.createSession(USER));

    const root = requireFolder(
      await handler.handle({
        service: "drive",
        operation: "get-root-folder",
      }),
    );
    const reports = requireFolder(
      await handler.handle({
        service: "drive",
        operation: "create-folder",
        parent: root,
        name: "Reports",
      }),
    );

    const rootTextFile = requireFile(
      await handler.handle({
        service: "drive",
        operation: "create-file",
        parent: root,
        blob: {
          bytes: [65],
          contentType: "text/plain",
          name: "root.txt",
          googleType: false,
        },
      }),
    );
    await handler.handle({
      service: "drive",
      operation: "create-file",
      parent: root,
      blob: {
        bytes: [66],
        contentType: "application/json",
        name: "root.json",
        googleType: false,
      },
    });
    const nestedTextFile = requireFile(
      await handler.handle({
        service: "drive",
        operation: "create-file",
        parent: reports,
        blob: {
          bytes: [67],
          contentType: "text/plain",
          name: "nested.txt",
          googleType: false,
        },
      }),
    );
    await handler.handle({
      service: "drive",
      operation: "create-file",
      parent: reports,
      blob: {
        bytes: [68],
        contentType: null,
        name: "unknown",
        googleType: false,
      },
    });

    const allTextFiles = requireFileIterator(
      await handler.handle({
        service: "drive",
        operation: "get-files-by-type",
        mimeType: "text/plain",
      }),
    );

    await expect(
      handler.handle({
        service: "drive",
        operation: "file-iterator-next",
        iterator: allTextFiles,
      }),
    ).resolves.toStrictEqual(rootTextFile);
    await expect(
      handler.handle({
        service: "drive",
        operation: "file-iterator-next",
        iterator: allTextFiles,
      }),
    ).resolves.toStrictEqual(nestedTextFile);
    await expect(
      handler.handle({
        service: "drive",
        operation: "iterator-has-next",
        iterator: allTextFiles,
      }),
    ).resolves.toBe(false);

    const rootTextFiles = requireFileIterator(
      await handler.handle({
        service: "drive",
        operation: "get-files-by-type",
        folder: root,
        mimeType: "text/plain",
      }),
    );

    await expect(
      handler.handle({
        service: "drive",
        operation: "file-iterator-next",
        iterator: rootTextFiles,
      }),
    ).resolves.toStrictEqual(rootTextFile);
    await expect(
      handler.handle({
        service: "drive",
        operation: "iterator-has-next",
        iterator: rootTextFiles,
      }),
    ).resolves.toBe(false);

    const reportTextFiles = requireFileIterator(
      await handler.handle({
        service: "drive",
        operation: "get-files-by-type",
        folder: reports,
        mimeType: "text/plain",
      }),
    );

    await expect(
      handler.handle({
        service: "drive",
        operation: "file-iterator-next",
        iterator: reportTextFiles,
      }),
    ).resolves.toStrictEqual(nestedTextFile);
    await expect(
      handler.handle({
        service: "drive",
        operation: "iterator-has-next",
        iterator: reportTextFiles,
      }),
    ).resolves.toBe(false);
  });
});
