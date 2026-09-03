import { createGasEnum } from "../../globals/enum";
import type { CreateGasObject } from "../../globals/object";
import { createGasServiceObject } from "../../globals/serviceObject";
import type { RequestLegacySync } from "../../legacy/transport";
import type { CreateFile, CreateFolder } from "../../objects/types";
import { DriveApp } from "./DriveApp";

const FORWARDED_METHOD_NAMES = [
  "addFile",
  "addFolder",
  "continueFileIterator",
  "continueFolderIterator",
  "createFile",
  "createFolder",
  "createShortcut",
  "createShortcutForTargetIdAndResourceKey",
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
] as const satisfies readonly (keyof DriveApp)[];

type ForwardedMethodName = (typeof FORWARDED_METHOD_NAMES)[number];

function forwardMethod(
  implementation: DriveApp,
  name: ForwardedMethodName,
): (...args: unknown[]) => unknown {
  const method = implementation[name];

  if (typeof method !== "function") {
    throw new TypeError(`DriveApp.${name} is not callable.`);
  }

  return (...args: unknown[]) => Reflect.apply(method, implementation, args);
}

function unsupportedSurfaceMethod(): never {
  throw new Error("Function not implemented.");
}

export function createDriveApp(
  createFile: CreateFile,
  createFolder: CreateFolder,
  requestLegacySync: RequestLegacySync,
  createObject?: CreateGasObject,
) {
  const implementation = new DriveApp(createFile, createFolder, requestLegacySync);

  const access = createGasEnum(
    {
      members: ["ANYONE", "ANYONE_WITH_LINK", "DOMAIN", "DOMAIN_WITH_LINK", "PRIVATE"],
      representative: "PRIVATE",
    },
    createObject,
  );

  const permission = createGasEnum(
    {
      members: ["VIEW", "EDIT", "COMMENT", "OWNER", "ORGANIZER", "FILE_ORGANIZER", "NONE"],
      representative: "VIEW",
    },
    createObject,
  );

  const methodEntries = FORWARDED_METHOD_NAMES.map((name) => ({
    writable: true as const,
    name,
    value: forwardMethod(implementation, name),
  }));

  return createGasServiceObject(
    {
      entries: [
        {
          name: "toString",
          value: () => "Drive",
          writable: true,
        },
        {
          name: "Access",
          value: access,
          writable: false,
        },
        {
          name: "Permission",
          value: permission,
          writable: false,
        },
        ...methodEntries,
        {
          name: "enforceSingleParent",
          value: unsupportedSurfaceMethod,
          writable: true,
        },
      ],
    },
    createObject,
  );
}
