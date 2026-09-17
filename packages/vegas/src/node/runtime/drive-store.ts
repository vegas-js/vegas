import type { BlobValue } from "./blob-value";
import type { DriveFileReference, DriveFolderReference } from "./drive-reference";

export interface DriveNamespace {
  readonly userKey: string;
}

export interface DriveFileMetadata {
  readonly name: string | null;
  readonly mimeType: string | null;
}

/**
 * Persistent resource state for the local virtual Drive.
 *
 * Drive state is user-scoped and intentionally independent from the script
 * that performs an invocation. Iterator cursors and continuation snapshots are
 * owned separately by DriveIteratorStore.
 */
export interface DriveStore {
  createFile(
    namespace: DriveNamespace,
    parent: DriveFolderReference,
    blob: BlobValue,
  ): Promise<DriveFileReference>;
  createFolder(
    namespace: DriveNamespace,
    parent: DriveFolderReference,
    name: string,
  ): Promise<DriveFolderReference>;
  getFile(namespace: DriveNamespace, id: string, resourceKey?: string): Promise<DriveFileReference>;
  getFileBlob(namespace: DriveNamespace, file: DriveFileReference): Promise<BlobValue>;
  getFileMetadata(namespace: DriveNamespace, file: DriveFileReference): Promise<DriveFileMetadata>;
  setFileName(namespace: DriveNamespace, file: DriveFileReference, name: string): Promise<void>;
  getFolder(
    namespace: DriveNamespace,
    id: string,
    resourceKey?: string,
  ): Promise<DriveFolderReference>;
  getFolderName(namespace: DriveNamespace, folder: DriveFolderReference): Promise<string>;
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
  listFolderParents(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
  ): Promise<readonly DriveFolderReference[]>;
}
