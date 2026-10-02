import { DriveApp } from "./app";
import { DriveFile } from "./file";
import { DriveFileIterator } from "./file-iterator";
import { DriveFolder } from "./folder";
import { DriveFolderIterator } from "./folder-iterator";
import type { DriveObjectHydrator } from "./hydrator";
import type {
  DriveFileIteratorReference,
  DriveFileReference,
  DriveFolderIteratorReference,
  DriveFolderReference,
  DriveObjectReference,
} from "./reference";
import type { HostBridge } from "./runtime-boundary";

class RuntimeDriveObjectHydrator implements DriveObjectHydrator {
  readonly #bridge: HostBridge;

  constructor(bridge: HostBridge) {
    this.#bridge = bridge;
  }

  hydrate(reference: DriveFileReference): DriveFile;
  hydrate(reference: DriveFolderReference): DriveFolder;
  hydrate(reference: DriveFileIteratorReference): DriveFileIterator;
  hydrate(reference: DriveFolderIteratorReference): DriveFolderIterator;
  hydrate(
    reference: DriveObjectReference,
  ): DriveFile | DriveFolder | DriveFileIterator | DriveFolderIterator {
    switch (reference.kind) {
      case "file": {
        return new DriveFile(this.#bridge, reference, this);
      }
      case "folder": {
        return new DriveFolder(this.#bridge, reference, this);
      }
      case "file-iterator": {
        return new DriveFileIterator(this.#bridge, reference, this);
      }
      case "folder-iterator": {
        return new DriveFolderIterator(this.#bridge, reference, this);
      }
    }
  }
}

export function createDriveObjectHydrator(bridge: HostBridge): DriveObjectHydrator {
  return new RuntimeDriveObjectHydrator(bridge);
}

export function createDriveApp(bridge: HostBridge): DriveApp {
  return new DriveApp(bridge, createDriveObjectHydrator(bridge));
}
