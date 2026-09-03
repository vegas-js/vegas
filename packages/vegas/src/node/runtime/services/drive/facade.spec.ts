import { expect, test } from "vitest";

import type { RequestLegacySync } from "../../legacy/transport";
import type { CreateFile, CreateFolder } from "../../objects/types";
import { createDriveApp } from "./facade";

const unexpected = () => {
  throw new Error("Unexpected dependency call");
};

const createFile = unexpected as CreateFile;
const createFolder = unexpected as CreateFolder;
const requestLegacySync = unexpected as RequestLegacySync;

test("creates GAS-compatible DriveApp facade", () => {
  const driveApp = createDriveApp(createFile, createFolder, requestLegacySync) as any;

  expect(Object.getPrototypeOf(driveApp)).toBe(Object.prototype);
  expect(String(driveApp)).toBe("Drive");

  expect(Object.getOwnPropertyNames(driveApp).sort()).toEqual(
    [
      "Access",
      "Permission",
      "addFile",
      "addFolder",
      "continueFileIterator",
      "continueFolderIterator",
      "createFile",
      "createFolder",
      "createShortcut",
      "createShortcutForTargetIdAndResourceKey",
      "enforceSingleParent",
      "getFileById",
      "getFileByIdAndResourceKey",
      "getFiles",
      "getFilesByName",
      "getFilesByType",
      "getFolderById",
      "getFolderByIdAndResourceKey",
      "getFolders",
      "getFoldersByName",
      "getRootFolder",
      "getStorageLimit",
      "getStorageUsed",
      "getTrashedFiles",
      "getTrashedFolders",
      "removeFile",
      "removeFolder",
      "searchFiles",
      "searchFolders",
      "toString",
    ].sort(),
  );

  expect(Object.getOwnPropertyDescriptor(driveApp, "Access")?.writable).toBe(false);
  expect(Object.getOwnPropertyDescriptor(driveApp, "Permission")?.writable).toBe(false);

  expect(driveApp.Access).toBe(driveApp.Access.PRIVATE);
  expect(driveApp.Access.ANYONE.ordinal()).toBe(0);
  expect(driveApp.Access.PRIVATE.ordinal()).toBe(4);

  expect(driveApp.Permission).toBe(driveApp.Permission.VIEW);
  expect(driveApp.Permission.VIEW.ordinal()).toBe(0);
  expect(driveApp.Permission.COMMENT.ordinal()).toBe(2);
  expect(driveApp.Permission.FILE_ORGANIZER.ordinal()).toBe(5);
  expect(driveApp.Permission.NONE.ordinal()).toBe(6);

  expect(typeof driveApp.enforceSingleParent).toBe("function");
});
