import { serializeBlob, type RuntimeBlob } from "./blob";
import { createDriveFileBlob } from "./drive-create-file";
import type { DriveFile } from "./drive-file";
import type { DriveFileIterator } from "./drive-file-iterator";
import { registerDriveFolderIdentity, resolveDriveFolderReference } from "./drive-folder-identity";
import type { DriveFolderIterator } from "./drive-folder-iterator";
import type { DriveObjectHydrator } from "./drive-hydrator";
import type { DriveFolderReference } from "./drive-reference";
import type { HostBridge } from "./host-bridge";

// https://developers.google.com/apps-script/reference/drive/folder
export class DriveFolder {
  readonly #bridge: HostBridge;
  readonly #hydrator: DriveObjectHydrator;
  readonly #reference: DriveFolderReference;

  constructor(bridge: HostBridge, reference: DriveFolderReference, hydrator: DriveObjectHydrator) {
    this.#bridge = bridge;
    this.#reference = reference;
    this.#hydrator = hydrator;
    registerDriveFolderIdentity(this, bridge, reference);
  }

  createFile(blob: RuntimeBlob): DriveFile;
  createFile(name: string, content: string): DriveFile;
  createFile(name: string, content: string, mimeType: string): DriveFile;
  createFile(blobOrName: RuntimeBlob | string, content?: string, mimeType?: string): DriveFile {
    const blob = createDriveFileBlob(blobOrName, content, mimeType);

    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "create-file",
        parent: this.#reference,
        blob: serializeBlob(blob),
      }),
    );
  }

  createFolder(name: string): DriveFolder {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "create-folder",
        parent: this.#reference,
        name,
      }),
    );
  }

  createShortcut(targetId: string): DriveFile {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "create-shortcut",
        parent: this.#reference,
        targetId,
      }),
    );
  }

  createShortcutForTargetIdAndResourceKey(targetId: string, targetResourceKey: string): DriveFile {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "create-shortcut",
        parent: this.#reference,
        targetId,
        targetResourceKey,
      }),
    );
  }

  getFiles(): DriveFileIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-folder-files",
        folder: this.#reference,
      }),
    );
  }

  getFilesByName(name: string): DriveFileIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-files-by-name",
        folder: this.#reference,
        name,
      }),
    );
  }

  getFilesByType(mimeType: string): DriveFileIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-files-by-type",
        folder: this.#reference,
        mimeType,
      }),
    );
  }

  getFolders(): DriveFolderIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-folder-folders",
        folder: this.#reference,
      }),
    );
  }

  getFoldersByName(name: string): DriveFolderIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-folders-by-name",
        folder: this.#reference,
        name,
      }),
    );
  }

  getDateCreated(): Date {
    return new Date(
      this.#bridge.call({
        service: "drive",
        operation: "get-folder-date-created",
        folder: this.#reference,
      }),
    );
  }

  getDescription(): string | null {
    return this.#bridge.call({
      service: "drive",
      operation: "get-folder-description",
      folder: this.#reference,
    });
  }

  getId(): string {
    return this.#reference.id;
  }

  getLastUpdated(): Date {
    return new Date(
      this.#bridge.call({
        service: "drive",
        operation: "get-folder-last-updated",
        folder: this.#reference,
      }),
    );
  }

  getName(): string {
    return this.#bridge.call({
      service: "drive",
      operation: "get-folder-name",
      folder: this.#reference,
    });
  }

  getResourceKey(): string | null {
    return this.#reference.resourceKey ?? null;
  }

  isStarred(): boolean {
    return this.#bridge.call({
      service: "drive",
      operation: "get-folder-starred",
      folder: this.#reference,
    });
  }

  isTrashed(): boolean {
    return this.#bridge.call({
      service: "drive",
      operation: "get-folder-trashed",
      folder: this.#reference,
    });
  }

  getParents(): DriveFolderIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-folder-parents",
        folder: this.#reference,
      }),
    );
  }

  moveTo(destination: DriveFolder): DriveFolder {
    this.#bridge.call({
      service: "drive",
      operation: "move-folder",
      folder: this.#reference,
      destination: resolveDriveFolderReference(this.#bridge, destination),
    });
    return this;
  }

  setDescription(description: string): DriveFolder {
    this.#bridge.call({
      service: "drive",
      operation: "set-folder-description",
      folder: this.#reference,
      description,
    });
    return this;
  }

  setName(name: string): DriveFolder {
    this.#bridge.call({
      service: "drive",
      operation: "set-folder-name",
      folder: this.#reference,
      name,
    });
    return this;
  }

  setStarred(starred: boolean): DriveFolder {
    this.#bridge.call({
      service: "drive",
      operation: "set-folder-starred",
      folder: this.#reference,
      starred,
    });
    return this;
  }

  setTrashed(trashed: boolean): DriveFolder {
    this.#bridge.call({
      service: "drive",
      operation: "set-folder-trashed",
      folder: this.#reference,
      trashed,
    });
    return this;
  }
}
