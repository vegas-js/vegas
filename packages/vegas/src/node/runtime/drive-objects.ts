import type { DriveObjectHydrator } from "./drive-hydrator";
import type {
  DriveFileIteratorReference,
  DriveFileReference,
  DriveFolderIteratorReference,
  DriveFolderReference,
} from "./drive-reference";
import type { HostBridge } from "./host-bridge";

// https://developers.google.com/apps-script/reference/drive/drive-app
export class DriveApp {
  readonly #bridge: HostBridge;
  readonly #hydrator: DriveObjectHydrator;

  constructor(bridge: HostBridge, hydrator: DriveObjectHydrator) {
    this.#bridge = bridge;
    this.#hydrator = hydrator;
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

  getRootFolder(): DriveFolder {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "drive",
        operation: "get-root-folder",
      }),
    );
  }
}

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

  getId(): string {
    return this.#reference.id;
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
}

// https://developers.google.com/apps-script/reference/drive/folder
export class DriveFolder {
  readonly #bridge: HostBridge;
  readonly #hydrator: DriveObjectHydrator;
  readonly #reference: DriveFolderReference;

  constructor(bridge: HostBridge, reference: DriveFolderReference, hydrator: DriveObjectHydrator) {
    this.#bridge = bridge;
    this.#reference = reference;
    this.#hydrator = hydrator;
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
