import type { DriveFileReference, DriveFolderReference } from "./drive-reference";

/**
 * Persistent resource state for the local virtual Drive.
 *
 * Iterator cursors and continuation snapshots are owned separately by
 * DriveIteratorStore.
 */
export interface DriveStore {
  getFile(id: string, resourceKey?: string): Promise<DriveFileReference>;
  getFolder(id: string, resourceKey?: string): Promise<DriveFolderReference>;
  getRootFolder(): Promise<DriveFolderReference>;
  listFiles(): Promise<readonly DriveFileReference[]>;
  listFolders(): Promise<readonly DriveFolderReference[]>;
  listFileParents(file: DriveFileReference): Promise<readonly DriveFolderReference[]>;
  listFolderFiles(folder: DriveFolderReference): Promise<readonly DriveFileReference[]>;
  listFolderFolders(folder: DriveFolderReference): Promise<readonly DriveFolderReference[]>;
}
