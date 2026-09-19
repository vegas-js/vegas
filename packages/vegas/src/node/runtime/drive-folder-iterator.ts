import type { DriveObjectHydrator } from "./drive-hydrator";
import type { DriveFolder } from "./drive-objects";
import type { DriveFolderIteratorReference } from "./drive-reference";
import type { HostBridge } from "./host-bridge";

// https://developers.google.com/apps-script/reference/drive/folder-iterator
export class DriveFolderIterator {
  readonly #bridge: HostBridge;
  readonly #hydrator: DriveObjectHydrator;
  readonly #reference: DriveFolderIteratorReference;

  constructor(
    bridge: HostBridge,
    reference: DriveFolderIteratorReference,
    hydrator: DriveObjectHydrator,
  ) {
    this.#bridge = bridge;
    this.#reference = reference;
    this.#hydrator = hydrator;
  }

  getContinuationToken(): string {
    return this.#bridge.call({
      service: "drive",
      operation: "iterator-continuation-token",
      iterator: this.#reference,
    });
  }

  hasNext(): boolean {
    return this.#bridge.call({
      service: "drive",
      operation: "iterator-has-next",
      iterator: this.#reference,
    });
  }

  next(): DriveFolder {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "folder-iterator-next",
        iterator: this.#reference,
      }),
    );
  }
}
