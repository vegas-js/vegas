import { describe, expect, expectTypeOf, test } from "vitest";

import type {
  DriveFile,
  DriveFileIterator,
  DriveFileIteratorReference,
  DriveFileReference,
  DriveFolder,
  DriveFolderIterator,
  DriveFolderIteratorReference,
  DriveFolderReference,
  DriveObjectHydrator,
  HydratedDriveObject,
} from "./index";

describe("Drive object references", () => {
  test("keep Drive resource identity separate from Runtime iterator handles", () => {
    const file = {
      service: "drive",
      kind: "file",
      id: "file-id",
      resourceKey: "file-resource-key",
    } satisfies DriveFileReference;
    const folder = {
      service: "drive",
      kind: "folder",
      id: "folder-id",
    } satisfies DriveFolderReference;
    const fileIterator = {
      service: "drive",
      kind: "file-iterator",
      handle: "file-iterator-handle",
    } satisfies DriveFileIteratorReference;
    const folderIterator = {
      service: "drive",
      kind: "folder-iterator",
      handle: "folder-iterator-handle",
    } satisfies DriveFolderIteratorReference;

    expect(file).toStrictEqual({
      service: "drive",
      kind: "file",
      id: "file-id",
      resourceKey: "file-resource-key",
    });
    expect(folder).toStrictEqual({
      service: "drive",
      kind: "folder",
      id: "folder-id",
    });
    expect(fileIterator).toStrictEqual({
      service: "drive",
      kind: "file-iterator",
      handle: "file-iterator-handle",
    });
    expect(folderIterator).toStrictEqual({
      service: "drive",
      kind: "folder-iterator",
      handle: "folder-iterator-handle",
    });

    expect("handle" in file).toBe(false);
    expect("handle" in folder).toBe(false);
    expect("id" in fileIterator).toBe(false);
    expect("id" in folderIterator).toBe(false);
    expect("continuationToken" in fileIterator).toBe(false);
    expect("continuationToken" in folderIterator).toBe(false);
  });

  test("map each reference kind to its Runtime public object Class", () => {
    expectTypeOf<HydratedDriveObject<DriveFileReference>>().toEqualTypeOf<DriveFile>();
    expectTypeOf<HydratedDriveObject<DriveFolderReference>>().toEqualTypeOf<DriveFolder>();
    expectTypeOf<
      HydratedDriveObject<DriveFileIteratorReference>
    >().toEqualTypeOf<DriveFileIterator>();
    expectTypeOf<
      HydratedDriveObject<DriveFolderIteratorReference>
    >().toEqualTypeOf<DriveFolderIterator>();

    expectTypeOf<DriveObjectHydrator["hydrate"]>().toBeFunction();
  });

  test("keep references serializable as plain host data", () => {
    const references = [
      {
        service: "drive",
        kind: "file",
        id: "file-id",
      },
      {
        service: "drive",
        kind: "folder",
        id: "folder-id",
        resourceKey: "folder-resource-key",
      },
      {
        service: "drive",
        kind: "file-iterator",
        handle: "file-iterator-handle",
      },
      {
        service: "drive",
        kind: "folder-iterator",
        handle: "folder-iterator-handle",
      },
    ] satisfies (
      | DriveFileReference
      | DriveFolderReference
      | DriveFileIteratorReference
      | DriveFolderIteratorReference
    )[];

    expect(JSON.parse(JSON.stringify(references))).toStrictEqual(references);
  });
});
