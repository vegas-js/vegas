import type { RuntimeBlob } from "./blob";
import { createDriveFileBlob } from "./drive-create-file";
import { DRIVE_ACCESS, DRIVE_PERMISSION } from "./drive-enum";
import type { DriveFile } from "./drive-file";
import type { DriveFileIterator } from "./drive-file-iterator";
import type { DriveFolder } from "./drive-folder";
import type { DriveFolderIterator } from "./drive-folder-iterator";
import type { DriveObjectHydrator } from "./drive-hydrator";
import type { HostBridge } from "./host-bridge";

// https://developers.google.com/apps-script/reference/drive/drive-app
export class DriveApp {
  readonly #bridge: HostBridge;
  readonly #hydrator: DriveObjectHydrator;

  readonly Access = DRIVE_ACCESS;
  readonly Permission = DRIVE_PERMISSION;

  constructor(bridge: HostBridge, hydrator: DriveObjectHydrator) {
    this.#bridge = bridge;
    this.#hydrator = hydrator;
  }

  createFile(blob: RuntimeBlob): DriveFile;
  createFile(name: string, content: string): DriveFile;
  createFile(name: string, content: string, mimeType: string): DriveFile;
  createFile(blobOrName: RuntimeBlob | string, content?: string, mimeType?: string): DriveFile {
    return this.getRootFolder().createFile(createDriveFileBlob(blobOrName, content, mimeType));
  }

  createFolder(name: string): DriveFolder {
    return this.getRootFolder().createFolder(name);
  }

  continueFileIterator(continuationToken: string): DriveFileIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "continue-file-iterator",
        continuationToken,
      }),
    );
  }

  continueFolderIterator(continuationToken: string): DriveFolderIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "continue-folder-iterator",
        continuationToken,
      }),
    );
  }

  getFileById(id: string): DriveFile {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-file",
        id,
      }),
    );
  }

  getFileByIdAndResourceKey(id: string, resourceKey: string): DriveFile {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-file",
        id,
        resourceKey,
      }),
    );
  }

  getFiles(): DriveFileIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-files",
      }),
    );
  }

  getTrashedFiles(): DriveFileIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-trashed-files",
      }),
    );
  }

  getFilesByName(name: string): DriveFileIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-files-by-name",
        name,
      }),
    );
  }

  getFilesByType(mimeType: string): DriveFileIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-files-by-type",
        mimeType,
      }),
    );
  }

  getFolderById(id: string): DriveFolder {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-folder",
        id,
      }),
    );
  }

  getFolderByIdAndResourceKey(id: string, resourceKey: string): DriveFolder {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-folder",
        id,
        resourceKey,
      }),
    );
  }

  getFolders(): DriveFolderIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-folders",
      }),
    );
  }

  getTrashedFolders(): DriveFolderIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-trashed-folders",
      }),
    );
  }

  getFoldersByName(name: string): DriveFolderIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-folders-by-name",
        name,
      }),
    );
  }

  getRootFolder(): DriveFolder {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-root-folder",
      }),
    );
  }
}
