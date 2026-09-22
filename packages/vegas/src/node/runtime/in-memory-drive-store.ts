import { MIME_TYPE } from "./base-mime-type";
import type { BlobValue } from "./blob-value";
import type { DriveFileReference, DriveFolderReference } from "./drive-reference";
import type {
  DriveFileMetadata,
  DriveNamespace,
  DriveShortcutTarget,
  DriveStore,
} from "./drive-store";

type DriveFileContent = {
  readonly bytes: readonly number[];
  readonly googleType: boolean;
};

type DriveFileState = {
  readonly reference: DriveFileReference;
  content: DriveFileContent;
  metadata: DriveFileMetadata;
  parentIds: string[];
  shortcutTarget: DriveShortcutTarget | null;
  trashed: boolean;
};

type DriveFolderState = {
  readonly reference: DriveFolderReference;
  name: string | null;
  parentIds: string[];
  trashed: boolean;
};

type DriveState = {
  readonly root: DriveFolderState;
  readonly files: Map<string, DriveFileState>;
  readonly folders: Map<string, DriveFolderState>;
};

function createNamespaceKey(namespace: DriveNamespace): string {
  return JSON.stringify(["user", namespace.userKey]);
}

function cloneFileMetadata(metadata: DriveFileMetadata): DriveFileMetadata {
  return { ...metadata };
}

function cloneFile(reference: DriveFileReference): DriveFileReference {
  return { ...reference };
}

function cloneShortcutTarget(target: DriveShortcutTarget | null): DriveShortcutTarget | null {
  return target === null ? null : { ...target };
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
      content: {
        bytes: [...blob.bytes],
        googleType: blob.googleType,
      },
      metadata: {
        name: blob.name,
        mimeType: blob.contentType,
      },
      parentIds: [parentState.reference.id],
      shortcutTarget: null,
      trashed: false,
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
      trashed: false,
    });

    return cloneFolder(reference);
  }

  async createShortcut(
    namespace: DriveNamespace,
    parent: DriveFolderReference,
    targetId: string,
    targetResourceKey?: string,
  ): Promise<DriveFileReference> {
    const drive = this.#getOrCreateDrive(namespace);
    const parentState = this.#getFolderState(drive, parent.id, parent.resourceKey);
    const { name, target } = this.#resolveShortcutTarget(drive, targetId, targetResourceKey);

    this.#nextFileId += 1;
    const reference: DriveFileReference = {
      service: "drive",
      kind: "file",
      id: `drive-file:${this.#nextFileId}`,
    };
    drive.files.set(reference.id, {
      reference,
      content: {
        bytes: [],
        googleType: true,
      },
      metadata: {
        name,
        mimeType: MIME_TYPE.SHORTCUT,
      },
      parentIds: [parentState.reference.id],
      shortcutTarget: target,
      trashed: false,
    });

    return cloneFile(reference);
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
    const state = this.#getFileState(this.#getOrCreateDrive(namespace), file.id, file.resourceKey);

    return {
      bytes: [...state.content.bytes],
      contentType: state.metadata.mimeType,
      name: state.metadata.name,
      googleType: state.content.googleType,
    };
  }

  async getFileMetadata(
    namespace: DriveNamespace,
    file: DriveFileReference,
  ): Promise<DriveFileMetadata> {
    return cloneFileMetadata(
      this.#getFileState(this.#getOrCreateDrive(namespace), file.id, file.resourceKey).metadata,
    );
  }

  async getFileShortcutTarget(
    namespace: DriveNamespace,
    file: DriveFileReference,
  ): Promise<DriveShortcutTarget | null> {
    const state = this.#getFileState(this.#getOrCreateDrive(namespace), file.id, file.resourceKey);
    return cloneShortcutTarget(state.shortcutTarget);
  }

  async isFileTrashed(namespace: DriveNamespace, file: DriveFileReference): Promise<boolean> {
    const drive = this.#getOrCreateDrive(namespace);
    const state = this.#getFileState(drive, file.id, file.resourceKey);

    return this.#isFileTrashed(drive, state);
  }

  async setFileContent(
    namespace: DriveNamespace,
    file: DriveFileReference,
    bytes: readonly number[],
  ): Promise<void> {
    const state = this.#getFileState(this.#getOrCreateDrive(namespace), file.id, file.resourceKey);
    state.content = {
      ...state.content,
      bytes: [...bytes],
    };
  }

  async setFileName(
    namespace: DriveNamespace,
    file: DriveFileReference,
    name: string,
  ): Promise<void> {
    const state = this.#getFileState(this.#getOrCreateDrive(namespace), file.id, file.resourceKey);
    state.metadata = {
      ...state.metadata,
      name,
    };
  }

  async setFileTrashed(
    namespace: DriveNamespace,
    file: DriveFileReference,
    trashed: boolean,
  ): Promise<void> {
    const state = this.#getFileState(this.#getOrCreateDrive(namespace), file.id, file.resourceKey);
    state.trashed = trashed;
  }

  async moveFile(
    namespace: DriveNamespace,
    file: DriveFileReference,
    destination: DriveFolderReference,
  ): Promise<void> {
    const drive = this.#getOrCreateDrive(namespace);
    const state = this.#getFileState(drive, file.id, file.resourceKey);
    const destinationState = this.#getFolderState(drive, destination.id, destination.resourceKey);

    state.parentIds = [destinationState.reference.id];
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

  async getFolderName(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<string | null> {
    return this.#getFolderState(this.#getOrCreateDrive(namespace), folder.id, folder.resourceKey)
      .name;
  }

  async isFolderTrashed(namespace: DriveNamespace, folder: DriveFolderReference): Promise<boolean> {
    const drive = this.#getOrCreateDrive(namespace);
    const state = this.#getFolderState(drive, folder.id, folder.resourceKey);

    return this.#isFolderTrashed(drive, state);
  }

  async setFolderTrashed(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
    trashed: boolean,
  ): Promise<void> {
    const state = this.#getFolderState(
      this.#getOrCreateDrive(namespace),
      folder.id,
      folder.resourceKey,
    );
    state.trashed = trashed;
  }

  async getRootFolder(namespace: DriveNamespace): Promise<DriveFolderReference> {
    return cloneFolder(this.#getOrCreateDrive(namespace).root.reference);
  }

  async listFiles(namespace: DriveNamespace): Promise<readonly DriveFileReference[]> {
    const drive = this.#getOrCreateDrive(namespace);

    return [...drive.files.values()]
      .filter((state) => !this.#isFileTrashed(drive, state))
      .map(({ reference }) => cloneFile(reference));
  }

  async listTrashedFiles(namespace: DriveNamespace): Promise<readonly DriveFileReference[]> {
    const drive = this.#getOrCreateDrive(namespace);

    return [...drive.files.values()]
      .filter((state) => this.#isFileTrashed(drive, state))
      .map(({ reference }) => cloneFile(reference));
  }

  async listFolders(namespace: DriveNamespace): Promise<readonly DriveFolderReference[]> {
    const drive = this.#getOrCreateDrive(namespace);

    return [...drive.folders.values()]
      .filter((state) => !this.#isFolderTrashed(drive, state))
      .map(({ reference }) => cloneFolder(reference));
  }

  async listTrashedFolders(namespace: DriveNamespace): Promise<readonly DriveFolderReference[]> {
    const drive = this.#getOrCreateDrive(namespace);

    return [...drive.folders.values()]
      .filter((state) => this.#isFolderTrashed(drive, state))
      .map(({ reference }) => cloneFolder(reference));
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
      .filter(
        (state) =>
          state.parentIds.includes(parent.reference.id) && !this.#isFileTrashed(drive, state),
      )
      .map(({ reference }) => cloneFile(reference));
  }

  async listFolderFolders(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<readonly DriveFolderReference[]> {
    const drive = this.#getOrCreateDrive(namespace);
    const parent = this.#getFolderState(drive, folder.id, folder.resourceKey);

    return [...drive.folders.values()]
      .filter(
        (state) =>
          state.parentIds.includes(parent.reference.id) && !this.#isFolderTrashed(drive, state),
      )
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

  #resolveShortcutTarget(
    drive: DriveState,
    targetId: string,
    targetResourceKey: string | undefined,
  ): { readonly name: string; readonly target: DriveShortcutTarget } {
    const file = drive.files.get(targetId);

    if (file) {
      const { name, mimeType } = file.metadata;

      if (name === null) {
        throw new Error(`Local Drive shortcut target name is unavailable: ${targetId}`);
      }

      if (mimeType === null) {
        throw new Error(`Local Drive shortcut target MIME type is unavailable: ${targetId}`);
      }

      return {
        name,
        target: {
          id: targetId,
          mimeType,
          resourceKey: targetResourceKey ?? file.reference.resourceKey ?? null,
        },
      };
    }

    const folder = drive.root.reference.id === targetId ? drive.root : drive.folders.get(targetId);

    if (folder) {
      if (folder.name === null) {
        throw new Error(`Local Drive shortcut target name is unavailable: ${targetId}`);
      }

      return {
        name: folder.name,
        target: {
          id: targetId,
          mimeType: MIME_TYPE.FOLDER,
          resourceKey: targetResourceKey ?? folder.reference.resourceKey ?? null,
        },
      };
    }

    throw new Error(`Unknown local Drive shortcut target: ${targetId}`);
  }

  #isFileTrashed(drive: DriveState, state: DriveFileState): boolean {
    return (
      state.trashed ||
      state.parentIds.some((parentId) =>
        this.#isFolderTrashed(drive, this.#getFolderState(drive, parentId)),
      )
    );
  }

  #isFolderTrashed(
    drive: DriveState,
    state: DriveFolderState,
    visited: ReadonlySet<string> = new Set(),
  ): boolean {
    if (state.trashed) {
      return true;
    }

    if (visited.has(state.reference.id)) {
      return false;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(state.reference.id);

    return state.parentIds.some((parentId) =>
      this.#isFolderTrashed(drive, this.#getFolderState(drive, parentId), nextVisited),
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
        name: null,
        parentIds: [],
        trashed: false,
      },
      files: new Map(),
      folders: new Map(),
    };
    this.#drives.set(namespaceKey, created);
    return created;
  }
}
