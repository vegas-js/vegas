import type { DriveFileReference, DriveFolderReference } from "./drive-reference";

export interface DriveNamespace {
  readonly userKey: string;
}

/**
 * Persistent resource state for the local virtual Drive.
 *
 * Drive state is user-scoped and intentionally independent from the script
 * that performs an invocation. Iterator cursors and continuation snapshots are
 * owned separately by DriveIteratorStore.
 */
export interface DriveStore {
  getFile(namespace: DriveNamespace, id: string, resourceKey?: string): Promise<DriveFileReference>;
  getFolder(
    namespace: DriveNamespace,
    id: string,
    resourceKey?: string,
  ): Promise<DriveFolderReference>;
  getRootFolder(namespace: DriveNamespace): Promise<DriveFolderReference>;
  listFiles(namespace: DriveNamespace): Promise<readonly DriveFileReference[]>;
  listFolders(namespace: DriveNamespace): Promise<readonly DriveFolderReference[]>;
  listFileParents(
    namespace: DriveNamespace,
    file: DriveFileReference,
  ): Promise<readonly DriveFolderReference[]>;
  listFolderFiles(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<readonly DriveFileReference[]>;
  listFolderFolders(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<readonly DriveFolderReference[]>;
}
