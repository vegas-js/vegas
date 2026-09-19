import { serializeBlob, type RuntimeBlob } from "./blob";
import type { DriveFile } from "./drive-file";
import type { DriveFileIterator } from "./drive-file-iterator";
import { registerDriveFolderIdentity } from "./drive-folder-identity";
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

  createFile(blob: RuntimeBlob): DriveFile {
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

  getFiles(): DriveFileIterator {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-folder-files",
        folder: this.#reference,
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

  getId(): string {
    return this.#reference.id;
  }

  getName(): string {
    return this.#bridge.call({
      service: "drive",
      operation: "get-folder-name",
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
}
