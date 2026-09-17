import type {
  DriveFileIteratorReference,
  DriveFileReference,
  DriveFolderIteratorReference,
  DriveFolderReference,
  DriveIteratorReference,
} from "./drive-reference";

// https://developers.google.com/apps-script/reference/drive/file-iterator
// https://developers.google.com/apps-script/reference/drive/folder-iterator
export interface DriveIteratorSession {
  createFileIterator(values: readonly DriveFileReference[]): Promise<DriveFileIteratorReference>;
  createFolderIterator(
    values: readonly DriveFolderReference[],
  ): Promise<DriveFolderIteratorReference>;
  continueFileIterator(continuationToken: string): Promise<DriveFileIteratorReference>;
  continueFolderIterator(continuationToken: string): Promise<DriveFolderIteratorReference>;
  getContinuationToken(iterator: DriveIteratorReference): Promise<string>;
  hasNext(iterator: DriveIteratorReference): Promise<boolean>;
  nextFile(iterator: DriveFileIteratorReference): Promise<DriveFileReference>;
  nextFolder(iterator: DriveFolderIteratorReference): Promise<DriveFolderReference>;
}

/**
 * Owns continuation snapshots across invocations and creates invocation-local
 * iterator sessions. Opaque iterator handles never leave their session.
 */
export interface DriveIteratorStore {
  createSession(): DriveIteratorSession;
}
