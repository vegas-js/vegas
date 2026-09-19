import type { DriveObjectHydrator } from "./drive-hydrator";
import type { DriveFile } from "./drive-objects";
import type { DriveFileIteratorReference } from "./drive-reference";
import type { HostBridge } from "./host-bridge";

// https://developers.google.com/apps-script/reference/drive/file-iterator
export class DriveFileIterator {
  readonly #bridge: HostBridge;
  readonly #hydrator: DriveObjectHydrator;
  readonly #reference: DriveFileIteratorReference;

  constructor(
    bridge: HostBridge,
    reference: DriveFileIteratorReference,
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

  next(): DriveFile {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "file-iterator-next",
        iterator: this.#reference,
      }),
    );
  }
}
