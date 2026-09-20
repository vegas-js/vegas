import { describe, expect, test } from "vitest";

import {
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  LocalDriveHostHandler,
  type DriveFileIteratorReference,
  type DriveFileReference,
  type DriveFolderIteratorReference,
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

function requireFolderIterator(value: unknown): DriveFolderIteratorReference {
  if (
    typeof value !== "object" ||
    value === null ||
    !("kind" in value) ||
    value.kind !== "folder-iterator"
  ) {
    throw new Error("expected Drive folder iterator");
  }

  return value as DriveFolderIteratorReference;
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

describe("local Drive name queries", () => {
  test("filter Drive-wide and folder-scoped iterators by exact name", async () => {
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
    const archive = requireFolder(
      await handler.handle({
        service: "drive",
        operation: "create-folder",
        parent: root,
        name: "Archive",
      }),
    );
    const nestedReports = requireFolder(
      await handler.handle({
        service: "drive",
        operation: "create-folder",
        parent: archive,
        name: "Reports",
      }),
    );

    const rootReport = requireFile(
      await handler.handle({
        service: "drive",
        operation: "create-file",
        parent: root,
        blob: {
          bytes: [65],
          contentType: "text/plain",
          name: "report.txt",
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
        contentType: "text/plain",
        name: "other.txt",
        googleType: false,
      },
    });
    const nestedReport = requireFile(
      await handler.handle({
        service: "drive",
        operation: "create-file",
        parent: reports,
        blob: {
          bytes: [67],
          contentType: "text/plain",
          name: "report.txt",
          googleType: false,
        },
      }),
    );

    const allReports = requireFileIterator(
      await handler.handle({
        service: "drive",
        operation: "get-files-by-name",
        name: "report.txt",
      }),
    );

    await expect(
      handler.handle({
        service: "drive",
        operation: "file-iterator-next",
        iterator: allReports,
      }),
    ).resolves.toStrictEqual(rootReport);
    await expect(
      handler.handle({
        service: "drive",
        operation: "file-iterator-next",
        iterator: allReports,
      }),
    ).resolves.toStrictEqual(nestedReport);
    await expect(
      handler.handle({
        service: "drive",
        operation: "iterator-has-next",
        iterator: allReports,
      }),
    ).resolves.toBe(false);

    const rootReports = requireFileIterator(
      await handler.handle({
        service: "drive",
        operation: "get-files-by-name",
        folder: root,
        name: "report.txt",
      }),
    );
    await expect(
      handler.handle({
        service: "drive",
        operation: "file-iterator-next",
        iterator: rootReports,
      }),
    ).resolves.toStrictEqual(rootReport);
    await expect(
      handler.handle({
        service: "drive",
        operation: "iterator-has-next",
        iterator: rootReports,
      }),
    ).resolves.toBe(false);

    const allReportFolders = requireFolderIterator(
      await handler.handle({
        service: "drive",
        operation: "get-folders-by-name",
        name: "Reports",
      }),
    );
    await expect(
      handler.handle({
        service: "drive",
        operation: "folder-iterator-next",
        iterator: allReportFolders,
      }),
    ).resolves.toStrictEqual(reports);
    await expect(
      handler.handle({
        service: "drive",
        operation: "folder-iterator-next",
        iterator: allReportFolders,
      }),
    ).resolves.toStrictEqual(nestedReports);

    const rootReportFolders = requireFolderIterator(
      await handler.handle({
        service: "drive",
        operation: "get-folders-by-name",
        folder: root,
        name: "Reports",
      }),
    );
    await expect(
      handler.handle({
        service: "drive",
        operation: "folder-iterator-next",
        iterator: rootReportFolders,
      }),
    ).resolves.toStrictEqual(reports);
    await expect(
      handler.handle({
        service: "drive",
        operation: "iterator-has-next",
        iterator: rootReportFolders,
      }),
    ).resolves.toBe(false);
  });
});
