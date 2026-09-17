import type { DriveFileReference, DriveFolderReference } from "./drive-reference";
import type { DriveNamespace, DriveStore } from "./drive-store";

type DriveState = {
  readonly root: DriveFolderReference;
  readonly files: Map<string, DriveFileReference>;
  readonly folders: Map<string, DriveFolderReference>;
};

function createNamespaceKey(namespace: DriveNamespace): string {
  return JSON.stringify(["user", namespace.userKey]);
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

  async getFile(
    namespace: DriveNamespace,
    id: string,
    resourceKey?: string,
  ): Promise<DriveFileReference> {
    const file = this.#getOrCreateDrive(namespace).files.get(id);

    if (!file || !matchesResourceKey(file, resourceKey)) {
      throw new Error(`Unknown local Drive file: ${id}`);
    }

    return cloneFile(file);
  }

  async getFolder(
    namespace: DriveNamespace,
    id: string,
    resourceKey?: string,
  ): Promise<DriveFolderReference> {
    const drive = this.#getOrCreateDrive(namespace);
    const folder = drive.root.id === id ? drive.root : drive.folders.get(id);

    if (!folder || !matchesResourceKey(folder, resourceKey)) {
      throw new Error(`Unknown local Drive folder: ${id}`);
    }

    return cloneFolder(folder);
  }

  async getRootFolder(namespace: DriveNamespace): Promise<DriveFolderReference> {
    return cloneFolder(this.#getOrCreateDrive(namespace).root);
  }

  async listFiles(namespace: DriveNamespace): Promise<readonly DriveFileReference[]> {
    return [...this.#getOrCreateDrive(namespace).files.values()].map(cloneFile);
  }

  async listFolders(namespace: DriveNamespace): Promise<readonly DriveFolderReference[]> {
    return [...this.#getOrCreateDrive(namespace).folders.values()].map(cloneFolder);
  }

  async listFileParents(
    namespace: DriveNamespace,
    file: DriveFileReference,
  ): Promise<readonly DriveFolderReference[]> {
    await this.getFile(namespace, file.id, file.resourceKey);
    return [];
  }

  async listFolderFiles(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<readonly DriveFileReference[]> {
    await this.getFolder(namespace, folder.id, folder.resourceKey);
    return [];
  }

  async listFolderFolders(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<readonly DriveFolderReference[]> {
    await this.getFolder(namespace, folder.id, folder.resourceKey);
    return [];
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
        service: "drive",
        kind: "folder",
        id: `drive-root:${this.#nextRootId}`,
      },
      files: new Map(),
      folders: new Map(),
    };
    this.#drives.set(namespaceKey, created);
    return created;
  }
}
