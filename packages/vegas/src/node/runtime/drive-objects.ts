import { hydrateBlob, serializeBlob, type RuntimeBlob } from "./blob";
import type { DriveFileIterator } from "./drive-file-iterator";
import type { DriveFolderIterator } from "./drive-folder-iterator";
import type { DriveObjectHydrator } from "./drive-hydrator";
import type { DriveFileReference, DriveFolderReference } from "./drive-reference";
import type { HostBridge } from "./host-bridge";

type DriveFolderIdentity = {
  readonly bridge: HostBridge;
  readonly reference: DriveFolderReference;
};

const driveFolderIdentities = new WeakMap<DriveFolder, DriveFolderIdentity>();

function resolveDriveFolderReference(
  bridge: HostBridge,
  folder: DriveFolder,
): DriveFolderReference {
  const identity = driveFolderIdentities.get(folder);

  if (!identity || identity.bridge !== bridge) {
    throw new Error("Drive folder does not belong to this Runtime Drive.");
  }

  return { ...identity.reference };
}

// https://developers.google.com/apps-script/reference/drive/drive-app
export class DriveApp {
  readonly #bridge: HostBridge;
  readonly #hydrator: DriveObjectHydrator;

  constructor(bridge: HostBridge, hydrator: DriveObjectHydrator) {
    this.#bridge = bridge;
    this.#hydrator = hydrator;
  }

  createFile(blob: RuntimeBlob): DriveFile {
    return this.getRootFolder().createFile(blob);
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

// https://developers.google.com/apps-script/reference/drive/folder
export class DriveFolder {
  readonly #bridge: HostBridge;
  readonly #hydrator: DriveObjectHydrator;
  readonly #reference: DriveFolderReference;

  constructor(bridge: HostBridge, reference: DriveFolderReference, hydrator: DriveObjectHydrator) {
    this.#bridge = bridge;
    this.#reference = reference;
    this.#hydrator = hydrator;
    driveFolderIdentities.set(this, {
      bridge,
      reference: { ...reference },
    });
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
