import { hydrateBlob, type RuntimeBlob } from "./blob";
import { createBlobConverter } from "./blob-converter";
import type { DriveFolder } from "./drive-folder";
import { resolveDriveFolderReference } from "./drive-folder-identity";
import type { DriveFolderIterator } from "./drive-folder-iterator";
import type { DriveObjectHydrator } from "./drive-hydrator";
import type { DriveFileReference } from "./drive-reference";
import type { DriveShortcutTarget } from "./drive-store";
import type { HostBridge } from "./host-bridge";

// https://developers.google.com/apps-script/reference/drive/file
export class DriveFile {
  readonly #bridge: HostBridge;
  readonly #hydrator: DriveObjectHydrator;
  readonly #reference: DriveFileReference;

  constructor(bridge: HostBridge, reference: DriveFileReference, hydrator: DriveObjectHydrator) {
    this.#bridge = bridge;
    this.#reference = reference;
    this.#hydrator = hydrator;
  }

  getBlob(): RuntimeBlob {
    return hydrateBlob(
      this.#bridge.call({
        service: "drive",
        operation: "get-file-blob",
        file: this.#reference,
      }),
      createBlobConverter(this.#bridge),
    );
  }

  getDateCreated(): Date {
    return new Date(
      this.#bridge.call({
        service: "drive",
        operation: "get-file-date-created",
        file: this.#reference,
      }),
    );
  }

  getDescription(): string | null {
    return this.#bridge.call({
      service: "drive",
      operation: "get-file-description",
      file: this.#reference,
    });
  }

  getId(): string {
    return this.#reference.id;
  }

  getLastUpdated(): Date {
    return new Date(
      this.#bridge.call({
        service: "drive",
        operation: "get-file-last-updated",
        file: this.#reference,
      }),
    );
  }

  getMimeType(): string {
    return this.#bridge.call({
      service: "drive",
      operation: "get-file-mime-type",
      file: this.#reference,
    });
  }

  getName(): string {
    return this.#bridge.call({
      service: "drive",
      operation: "get-file-name",
      file: this.#reference,
    });
  }

  getResourceKey(): string | null {
    return this.#reference.resourceKey ?? null;
  }

  getSize(): number {
    return this.#bridge.call({
      service: "drive",
      operation: "get-file-size",
      file: this.#reference,
    });
  }

  getTargetId(): string | null {
    return this.#getShortcutTarget()?.id ?? null;
  }

  getTargetMimeType(): string | null {
    return this.#getShortcutTarget()?.mimeType ?? null;
  }

  getTargetResourceKey(): string | null {
    return this.#getShortcutTarget()?.resourceKey ?? null;
  }

  getParents(): DriveFolderIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-file-parents",
        file: this.#reference,
      }),
    );
  }

  isStarred(): boolean {
    return this.#bridge.call({
      service: "drive",
      operation: "get-file-starred",
      file: this.#reference,
    });
  }

  isTrashed(): boolean {
    return this.#bridge.call({
      service: "drive",
      operation: "get-file-trashed",
      file: this.#reference,
    });
  }

  moveTo(destination: DriveFolder): DriveFile {
    this.#bridge.call({
      service: "drive",
      operation: "move-file",
      file: this.#reference,
      destination: resolveDriveFolderReference(this.#bridge, destination),
    });
    return this;
  }

  setContent(content: string): DriveFile {
    this.#bridge.call({
      service: "drive",
      operation: "set-file-content",
      file: this.#reference,
      content,
    });
    return this;
  }

  setDescription(description: string): DriveFile {
    this.#bridge.call({
      service: "drive",
      operation: "set-file-description",
      file: this.#reference,
      description,
    });
    return this;
  }

  setName(name: string): DriveFile {
    this.#bridge.call({
      service: "drive",
      operation: "set-file-name",
      file: this.#reference,
      name,
    });
    return this;
  }

  setStarred(starred: boolean): DriveFile {
    this.#bridge.call({
      service: "drive",
      operation: "set-file-starred",
      file: this.#reference,
      starred,
    });
    return this;
  }

  setTrashed(trashed: boolean): DriveFile {
    this.#bridge.call({
      service: "drive",
      operation: "set-file-trashed",
      file: this.#reference,
      trashed,
    });
    return this;
  }

  #getShortcutTarget(): DriveShortcutTarget | null {
    return this.#bridge.call({
      service: "drive",
      operation: "get-file-shortcut-target",
      file: this.#reference,
    });
  }
}
