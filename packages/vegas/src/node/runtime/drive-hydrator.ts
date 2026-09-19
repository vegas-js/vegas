import type { DriveFileIterator } from "./drive-file-iterator";
import type { DriveFolderIterator } from "./drive-folder-iterator";
import type { DriveFile, DriveFolder } from "./drive-objects";
import type {
  DriveFileIteratorReference,
  DriveFileReference,
  DriveFolderIteratorReference,
  DriveFolderReference,
  DriveObjectReference,
} from "./drive-reference";

export type HydratedDriveObject<R extends DriveObjectReference> = R extends DriveFileReference
  ? DriveFile
  : R extends DriveFolderReference
    ? DriveFolder
    : R extends DriveFileIteratorReference
      ? DriveFileIterator
      : R extends DriveFolderIteratorReference
        ? DriveFolderIterator
        : never;

/**
 * Reconstructs Apps Script public objects from plain host references.
 *
 * Implementations return Runtime Class instances; references remain plain data
 * at the host bridge boundary.
 */
export interface DriveObjectHydrator {
  hydrate(reference: DriveFileReference): DriveFile;
  hydrate(reference: DriveFolderReference): DriveFolder;
  hydrate(reference: DriveFileIteratorReference): DriveFileIterator;
  hydrate(reference: DriveFolderIteratorReference): DriveFolderIterator;
}
