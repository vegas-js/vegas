import { hydrateBlob, type RuntimeBlob } from "./blob";
import { resolveDriveFolderReference } from "./drive-folder-identity";
import type { DriveFolderIterator } from "./drive-folder-iterator";
import type { DriveObjectHydrator } from "./drive-hydrator";
import type { DriveFolder } from "./drive-objects";
import type { DriveFileReference } from "./drive-reference";
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
    );
  }

  getId(): string {
    return this.#reference.id;
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

  getParents(): DriveFolderIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-file-parents",
        file: this.#reference,
      }),
    );
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

  setName(name: string): DriveFile {
    this.#bridge.call({
      service: "drive",
      operation: "set-file-name",
      file: this.#reference,
      name,
    });
    return this;
  }
}
