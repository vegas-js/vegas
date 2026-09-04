import { describe, expect, test, vi } from "vitest";

import type { RequestLegacySync } from "../../legacy/transport";
import type { CreateFile, CreateFolder } from "../../objects/types";
import { createDriveApp } from "./facade";

describe("Drive returned object reachability", () => {
  test("keeps Drive returned objects unreachable until their acquisition methods are implemented", () => {
    const createFile = vi.fn(() => {
      throw new Error("Unexpected File factory call");
    }) as unknown as CreateFile;

    const createFolder = vi.fn(() => {
      throw new Error("Unexpected Folder factory call");
    }) as unknown as CreateFolder;

    const requestLegacySync = vi.fn(() => {
      throw new Error("Unexpected legacy request");
    }) as unknown as RequestLegacySync;

    const driveApp = createDriveApp(createFile, createFolder, requestLegacySync) as any;

    const acquisitionCalls: Array<{
      name: string;
      args: unknown[];
    }> = [
      {
        name: "addFile",
        args: [{}],
      },
      {
        name: "addFolder",
        args: [{}],
      },
      {
        name: "continueFileIterator",
        args: ["continuation-token"],
      },
      {
        name: "continueFolderIterator",
        args: ["continuation-token"],
      },
      {
        name: "createFile",
        args: ["reference-file"],
      },
      {
        name: "createFolder",
        args: ["reference-folder"],
      },
      {
        name: "createShortcut",
        args: ["target-id"],
      },
      {
        name: "createShortcutForTargetIdAndResourceKey",
        args: ["target-id", "resource-key"],
      },
      {
        name: "getFileById",
        args: ["file-id"],
      },
      {
        name: "getFileByIdAndResourceKey",
        args: ["file-id", "resource-key"],
      },
      {
        name: "getFiles",
        args: [],
      },
      {
        name: "getFilesByName",
        args: ["reference-file"],
      },
      {
        name: "getFilesByType",
        args: ["text/plain"],
      },
      {
        name: "getFolderById",
        args: ["folder-id"],
      },
      {
        name: "getFolderByIdAndResourceKey",
        args: ["folder-id", "resource-key"],
      },
      {
        name: "getFolders",
        args: [],
      },
      {
        name: "getFoldersByName",
        args: ["reference-folder"],
      },
      {
        name: "getRootFolder",
        args: [],
      },
      {
        name: "getTrashedFiles",
        args: [],
      },
      {
        name: "getTrashedFolders",
        args: [],
      },
      {
        name: "removeFile",
        args: [{}],
      },
      {
        name: "removeFolder",
        args: [{}],
      },
      {
        name: "searchFiles",
        args: ["name contains 'reference'"],
      },
      {
        name: "searchFolders",
        args: ["name contains 'reference'"],
      },
    ];

    for (const { name, args } of acquisitionCalls) {
      expect(() => Reflect.apply(driveApp[name], driveApp, args), `DriveApp.${name}`).toThrow(
        "Method not implemented.",
      );
    }

    expect(createFile).not.toHaveBeenCalled();
    expect(createFolder).not.toHaveBeenCalled();

    expect(requestLegacySync).not.toHaveBeenCalled();
  });
});
