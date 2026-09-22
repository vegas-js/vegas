import type { BlobValue } from "./blob-value";
import type { DriveFileReference, DriveFolderReference } from "./drive-reference";

export interface DriveNamespace {
  readonly userKey: string;
}

export interface DriveFileMetadata {
  readonly name: string | null;
  readonly mimeType: string | null;
}

export interface DriveShortcutTarget {
  readonly id: string;
  readonly mimeType: string;
  readonly resourceKey: string | null;
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
  createShortcut(
    namespace: DriveNamespace,
    parent: DriveFolderReference,
    targetId: string,
    targetResourceKey?: string,
  ): Promise<DriveFileReference>;
  getFile(namespace: DriveNamespace, id: string, resourceKey?: string): Promise<DriveFileReference>;
  getFileBlob(namespace: DriveNamespace, file: DriveFileReference): Promise<BlobValue>;
  getFileMetadata(namespace: DriveNamespace, file: DriveFileReference): Promise<DriveFileMetadata>;
  getFileSize(namespace: DriveNamespace, file: DriveFileReference): Promise<number>;
  getFileShortcutTarget(
    namespace: DriveNamespace,
    file: DriveFileReference,
  ): Promise<DriveShortcutTarget | null>;
  isFileTrashed(namespace: DriveNamespace, file: DriveFileReference): Promise<boolean>;
  setFileContent(
    namespace: DriveNamespace,
    file: DriveFileReference,
    bytes: readonly number[],
  ): Promise<void>;
  setFileName(namespace: DriveNamespace, file: DriveFileReference, name: string): Promise<void>;
  setFileTrashed(
    namespace: DriveNamespace,
    file: DriveFileReference,
    trashed: boolean,
  ): Promise<void>;
  moveFile(
    namespace: DriveNamespace,
    file: DriveFileReference,
    destination: DriveFolderReference,
  ): Promise<void>;
  getFolder(
    namespace: DriveNamespace,
    id: string,
    resourceKey?: string,
  ): Promise<DriveFolderReference>;
  getFolderName(namespace: DriveNamespace, folder: DriveFolderReference): Promise<string | null>;
  moveFolder(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
    destination: DriveFolderReference,
  ): Promise<void>;
  setFolderName(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
    name: string,
  ): Promise<void>;
  isFolderTrashed(namespace: DriveNamespace, folder: DriveFolderReference): Promise<boolean>;
  setFolderTrashed(
    namespace: DriveNamespace,
    folder: DriveFolderReference,
    trashed: boolean,
  ): Promise<void>;
  getRootFolder(namespace: DriveNamespace): Promise<DriveFolderReference>;
  listFiles(namespace: DriveNamespace): Promise<readonly DriveFileReference[]>;
  listTrashedFiles(namespace: DriveNamespace): Promise<readonly DriveFileReference[]>;
  listFolders(namespace: DriveNamespace): Promise<readonly DriveFolderReference[]>;
  listTrashedFolders(namespace: DriveNamespace): Promise<readonly DriveFolderReference[]>;
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
