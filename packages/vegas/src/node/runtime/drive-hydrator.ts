import type {
  DriveFileIteratorReference,
  DriveFileReference,
  DriveFolderIteratorReference,
  DriveFolderReference,
  DriveObjectReference,
} from "./drive-reference";

export type HydratedDriveObject<R extends DriveObjectReference> =
  R extends DriveFileReference
    ? GoogleAppsScript.Drive.File
    : R extends DriveFolderReference
      ? GoogleAppsScript.Drive.Folder
      : R extends DriveFileIteratorReference
        ? GoogleAppsScript.Drive.FileIterator
        : R extends DriveFolderIteratorReference
          ? GoogleAppsScript.Drive.FolderIterator
          : never;

/**
 * Reconstructs Apps Script public objects from plain host references.
 *
 * Implementations return Runtime Class instances; references remain plain data
 * at the host bridge boundary.
 */
export interface DriveObjectHydrator {
  hydrate<R extends DriveObjectReference>(reference: R): HydratedDriveObject<R>;
}
