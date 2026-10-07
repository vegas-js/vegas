import type { DriveFile } from "./file";
import type { DriveFileIterator } from "./file-iterator";
import type { DriveFolder } from "./folder";
import type { DriveFolderIterator } from "./folder-iterator";
import type {
  DriveFileIteratorReference,
  DriveFileReference,
  DriveFolderIteratorReference,
  DriveFolderReference,
  DriveObjectReference,
} from "./reference";

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
