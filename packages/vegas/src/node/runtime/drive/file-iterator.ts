import type { DriveFile } from "./file";
import type { DriveObjectHydrator } from "./hydrator";
import type { DriveFileIteratorReference } from "./reference";
import type { HostBridge } from "./runtime-boundary";

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
