import type { BlobValue } from "./blob-value";
import type { DriveFileReference, DriveFolderReference } from "./drive-reference";
import type { DriveNamespace, DriveStore } from "./drive-store";

type DriveFileState = {
  readonly reference: DriveFileReference;
  readonly blob: BlobValue;
  parentIds: string[];
};

type DriveFolderState = {
  readonly reference: DriveFolderReference;
  name: string;
  parentIds: string[];
};

type DriveState = {
  readonly root: DriveFolderState;
  readonly files: Map<string, DriveFileState>;
  readonly folders: Map<string, DriveFolderState>;
};

function createNamespaceKey(namespace: DriveNamespace): string {
  return JSON.stringify(["user", namespace.userKey]);
}

function cloneBlobValue(value: BlobValue): BlobValue {
  return {
    bytes: [...value.bytes],
    contentType: value.contentType,
    name: value.name,
    googleType: value.googleType,
  };
}

function cloneFile(reference: DriveFileReference): DriveFileReference {
  return { ...reference };
}

function cloneFolder(reference: DriveFolderReference): DriveFolderReference {
  return { ...reference };
}

function matchesResourceKey(
  reference: DriveFileReference | DriveFolderReference,
  resourceKey: string | undefined,
): boolean {
  return resourceKey === undefined || reference.resourceKey === resourceKey;
}

export class InMemoryDriveStore implements DriveStore {
  readonly #drives = new Map<string, DriveState>();
  #nextRootId = 0;
  #nextFileId = 0;
  #nextFolderId = 0;

  async createFile(
    namespace: DriveNamespace,
    parent: DriveFolderReference,
    blob: BlobValue,
  ): Promise<DriveFileReference> {
    const drive = this.#getOrCreateDrive(namespace);
    const parentState = this.#getFolderState(drive, parent.id, parent.resourceKey);

    this.#nextFileId += 1;
    const reference: DriveFileReference = {
      service: "drive",
      kind: "file",
      id: `drive-file:${this.#nextFileId}`,
    };
    drive.files.set(reference.id, {
      reference,
      blob: cloneBlobValue(blob),
      parentIds: [parentState.reference.id],
    });

    return cloneFile(reference);
  }

  async createFolder(
    namespace: DriveNamespace,
    parent: DriveFolderReference,
    name: string,
  ): Promise<DriveFolderReference> {
    const drive = this.#getOrCreateDrive(namespace);
    const parentState = this.#getFolderState(drive, parent.id, parent.resourceKey);

    this.#nextFolderId += 1;
    const reference: DriveFolderReference = {
      service: "drive",
      kind: "folder",
      id: `drive-folder:${this.#nextFolderId}`,
    };
    drive.folders.set(reference.id, {
      reference,
      name,
      parentIds: [parentState.reference.id],
    });

    return cloneFolder(reference);
  }

  async getFile(
    namespace: DriveNamespace,
    id: string,
    resourceKey?: string,
  ): Promise<DriveFileReference> {
    return cloneFile(
      this.#getFileState(this.#getOrCreateDrive(namespace), id, resourceKey).reference,
    );
  }

  async getFileBlob(namespace: DriveNamespace, file: DriveFileReference): Promise<BlobValue> {
    return cloneBlobValue(
      this.#getFileState(this.#getOrCreateDrive(namespace), file.id, file.resourceKey).blob,
    );
  }

  async getFolder(
    namespace: DriveNamespace,
    id: string,
    resourceKey?: string,
  ): Promise<DriveFolderReference> {
    return cloneFolder(
      this.#getFolderState(this.#getOrCreateDrive(namespace), id, resourceKey).reference,
    );
  }

  async getFolderName(namespace: DriveNamespace, folder: DriveFolderReference): Promise<string> {
    return this.#getFolderState(this.#getOrCreateDrive(namespace), folder.id, folder.resourceKey)
      .name;
  }

  async getRootFolder(namespace: DriveNamespace): Promise<DriveFolderReference> {
    return cloneFolder(this.#getOrCreateDrive(namespace).root.reference);
  }

  async listFiles(namespace: DriveNamespace): Promise<readonly DriveFileReference[]> {
    return [...this.#getOrCreateDrive(namespace).files.values()].map(({ reference }) =>
      cloneFile(reference),
    );
  }

  async listFolders(namespace: DriveNamespace): Promise<readonly DriveFolderReference[]> {
    return [...this.#getOrCreateDrive(namespace).folders.values()].map(({ reference }) =>
      cloneFolder(reference),
    );
  }

  async listFileParents(
    namespace: DriveNamespace,
    file: DriveFileReference,
  ): Promise<readonly DriveFolderReference[]> {
    const drive = this.#getOrCreateDrive(namespace);
    const state = this.#getFileState(drive, file.id, file.resourceKey);

    return state.parentIds.map((parentId) =>
      cloneFolder(this.#getFolderState(drive, parentId).reference),
    );
  }

  async listFolderFiles(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<readonly DriveFileReference[]> {
    const drive = this.#getOrCreateDrive(namespace);
    const parent = this.#getFolderState(drive, folder.id, folder.resourceKey);

    return [...drive.files.values()]
      .filter(({ parentIds }) => parentIds.includes(parent.reference.id))
      .map(({ reference }) => cloneFile(reference));
  }

  async listFolderFolders(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<readonly DriveFolderReference[]> {
    const drive = this.#getOrCreateDrive(namespace);
    const parent = this.#getFolderState(drive, folder.id, folder.resourceKey);

    return [...drive.folders.values()]
      .filter(({ parentIds }) => parentIds.includes(parent.reference.id))
      .map(({ reference }) => cloneFolder(reference));
  }

  async listFolderParents(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<readonly DriveFolderReference[]> {
    const drive = this.#getOrCreateDrive(namespace);
    const state = this.#getFolderState(drive, folder.id, folder.resourceKey);

    return state.parentIds.map((parentId) =>
      cloneFolder(this.#getFolderState(drive, parentId).reference),
    );
  }

  #getFileState(drive: DriveState, id: string, resourceKey?: string): DriveFileState {
    const state = drive.files.get(id);

    if (!state || !matchesResourceKey(state.reference, resourceKey)) {
      throw new Error(`Unknown local Drive file: ${id}`);
    }

    return state;
  }

  #getFolderState(drive: DriveState, id: string, resourceKey?: string): DriveFolderState {
    const state = drive.root.reference.id === id ? drive.root : drive.folders.get(id);

    if (!state || !matchesResourceKey(state.reference, resourceKey)) {
      throw new Error(`Unknown local Drive folder: ${id}`);
    }

    return state;
  }

  #getOrCreateDrive(namespace: DriveNamespace): DriveState {
    const namespaceKey = createNamespaceKey(namespace);
    const existing = this.#drives.get(namespaceKey);

    if (existing) {
      return existing;
    }

    this.#nextRootId += 1;
    const created: DriveState = {
      root: {
        reference: {
          service: "drive",
          kind: "folder",
          id: `drive-root:${this.#nextRootId}`,
        },
        name: "My Drive",
        parentIds: [],
      },
      files: new Map(),
      folders: new Map(),
    };
    this.#drives.set(namespaceKey, created);
    return created;
  }
}
