import type { DriveFileReference, DriveFolderReference } from "./reference";
import type { DriveFileMetadata, DriveNamespace, DriveShortcutTarget } from "./store";

export type DriveFileContent = {
  readonly bytes: readonly number[];
  readonly googleType: boolean;
};

// Drive exposes creation and modification timestamps, but not Vegas's in-memory mutation model.
// Vegas advances lastUpdated only for direct item mutations, not starred state or child creation.
export type DriveTimestamps = {
  readonly createdAtMillis: number;
  lastUpdatedAtMillis: number;
};

export type DriveFileState = {
  readonly reference: DriveFileReference;
  content: DriveFileContent;
  description: string | null;
  metadata: DriveFileMetadata;
  parentIds: string[];
  shortcutTarget: DriveShortcutTarget | null;
  starred: boolean;
  timestamps: DriveTimestamps;
  trashed: boolean;
};

export type DriveFolderState = {
  readonly reference: DriveFolderReference;
  description: string | null;
  name: string | null;
  parentIds: string[];
  starred: boolean;
  timestamps: DriveTimestamps;
  trashed: boolean;
};

export type DriveState = {
  readonly root: DriveFolderState;
  readonly files: Map<string, DriveFileState>;
  readonly folders: Map<string, DriveFolderState>;
};

export function createNamespaceKey(namespace: DriveNamespace): string {
  return JSON.stringify(["user", namespace.userKey]);
}

export function createDriveState(rootId: string, now: number): DriveState {
  return {
    root: {
      reference: {
        service: "drive",
        kind: "folder",
        id: rootId,
      },
      description: null,
      name: null,
      parentIds: [],
      starred: false,
      timestamps: {
        createdAtMillis: now,
        lastUpdatedAtMillis: now,
      },
      trashed: false,
    },
    files: new Map(),
    folders: new Map(),
  };
}

export function cloneFileMetadata(metadata: DriveFileMetadata): DriveFileMetadata {
  return { ...metadata };
}

export function cloneFile(reference: DriveFileReference): DriveFileReference {
  return { ...reference };
}

export function cloneShortcutTarget(
  target: DriveShortcutTarget | null,
): DriveShortcutTarget | null {
  return target === null ? null : { ...target };
}

export function cloneFolder(reference: DriveFolderReference): DriveFolderReference {
  return { ...reference };
}

export function matchesResourceKey(
  reference: DriveFileReference | DriveFolderReference,
  resourceKey: string | undefined,
): boolean {
  return resourceKey === undefined || reference.resourceKey === resourceKey;
}
