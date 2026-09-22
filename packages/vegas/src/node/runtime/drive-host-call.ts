import type { BlobValue } from "./blob-value";
import type {
  DriveFileIteratorReference,
  DriveFileReference,
  DriveFolderIteratorReference,
  DriveFolderReference,
  DriveIteratorReference,
} from "./drive-reference";
import type { DriveShortcutTarget } from "./drive-store";

export type DriveHostCall =
  | {
      readonly service: "drive";
      readonly operation: "get-file";
      readonly id: string;
      readonly resourceKey?: string;
    }
  | {
      readonly service: "drive";
      readonly operation: "create-file";
      readonly parent: DriveFolderReference;
      readonly blob: BlobValue;
    }
  | {
      readonly service: "drive";
      readonly operation: "create-shortcut";
      readonly parent: DriveFolderReference;
      readonly targetId: string;
      readonly targetResourceKey?: string;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-file-blob";
      readonly file: DriveFileReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-file-description";
      readonly file: DriveFileReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-file-name";
      readonly file: DriveFileReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-file-mime-type";
      readonly file: DriveFileReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-file-size";
      readonly file: DriveFileReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-file-shortcut-target";
      readonly file: DriveFileReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-file-trashed";
      readonly file: DriveFileReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "set-file-trashed";
      readonly file: DriveFileReference;
      readonly trashed: boolean;
    }
  | {
      readonly service: "drive";
      readonly operation: "set-file-content";
      readonly file: DriveFileReference;
      readonly content: string;
    }
  | {
      readonly service: "drive";
      readonly operation: "set-file-description";
      readonly file: DriveFileReference;
      readonly description: string;
    }
  | {
      readonly service: "drive";
      readonly operation: "set-file-name";
      readonly file: DriveFileReference;
      readonly name: string;
    }
  | {
      readonly service: "drive";
      readonly operation: "move-file";
      readonly file: DriveFileReference;
      readonly destination: DriveFolderReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-folder";
      readonly id: string;
      readonly resourceKey?: string;
    }
  | {
      readonly service: "drive";
      readonly operation: "create-folder";
      readonly parent: DriveFolderReference;
      readonly name: string;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-folder-description";
      readonly folder: DriveFolderReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-folder-name";
      readonly folder: DriveFolderReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "move-folder";
      readonly folder: DriveFolderReference;
      readonly destination: DriveFolderReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "set-folder-description";
      readonly folder: DriveFolderReference;
      readonly description: string;
    }
  | {
      readonly service: "drive";
      readonly operation: "set-folder-name";
      readonly folder: DriveFolderReference;
      readonly name: string;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-folder-trashed";
      readonly folder: DriveFolderReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "set-folder-trashed";
      readonly folder: DriveFolderReference;
      readonly trashed: boolean;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-root-folder";
    }
  | {
      readonly service: "drive";
      readonly operation: "get-files";
    }
  | {
      readonly service: "drive";
      readonly operation: "get-trashed-files";
    }
  | {
      readonly service: "drive";
      readonly operation: "get-files-by-name";
      readonly name: string;
      readonly folder?: DriveFolderReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-files-by-type";
      readonly mimeType: string;
      readonly folder?: DriveFolderReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-folders";
    }
  | {
      readonly service: "drive";
      readonly operation: "get-trashed-folders";
    }
  | {
      readonly service: "drive";
      readonly operation: "get-folders-by-name";
      readonly name: string;
      readonly folder?: DriveFolderReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "continue-file-iterator";
      readonly continuationToken: string;
    }
  | {
      readonly service: "drive";
      readonly operation: "continue-folder-iterator";
      readonly continuationToken: string;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-file-parents";
      readonly file: DriveFileReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-folder-files";
      readonly folder: DriveFolderReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-folder-folders";
      readonly folder: DriveFolderReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "get-folder-parents";
      readonly folder: DriveFolderReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "iterator-has-next";
      readonly iterator: DriveIteratorReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "iterator-continuation-token";
      readonly iterator: DriveIteratorReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "file-iterator-next";
      readonly iterator: DriveFileIteratorReference;
    }
  | {
      readonly service: "drive";
      readonly operation: "folder-iterator-next";
      readonly iterator: DriveFolderIteratorReference;
    };

export type DriveHostCallResult<C extends DriveHostCall> = C extends {
  readonly operation: "get-file" | "create-file" | "create-shortcut" | "file-iterator-next";
}
  ? DriveFileReference
  : C extends {
        readonly operation:
          | "get-folder"
          | "get-root-folder"
          | "create-folder"
          | "folder-iterator-next";
      }
    ? DriveFolderReference
    : C extends {
          readonly operation:
            | "get-files"
            | "get-files-by-name"
            | "get-files-by-type"
            | "get-trashed-files"
            | "continue-file-iterator"
            | "get-folder-files";
        }
      ? DriveFileIteratorReference
      : C extends {
            readonly operation:
              | "get-folders"
              | "get-folders-by-name"
              | "get-trashed-folders"
              | "continue-folder-iterator"
              | "get-file-parents"
              | "get-folder-folders"
              | "get-folder-parents";
          }
        ? DriveFolderIteratorReference
        : C extends {
              readonly operation: "get-file-size";
            }
          ? number
          : C extends {
                readonly operation: "get-file-shortcut-target";
              }
            ? DriveShortcutTarget | null
            : C extends {
                  readonly operation: "get-file-blob";
                }
              ? BlobValue
              : C extends {
                    readonly operation:
                      | "iterator-has-next"
                      | "get-file-trashed"
                      | "get-folder-trashed";
                  }
                ? boolean
                : C extends {
                      readonly operation:
                        | "set-file-content"
                        | "set-file-description"
                        | "set-file-name"
                        | "set-file-trashed"
                        | "set-folder-description"
                        | "set-folder-name"
                        | "set-folder-trashed"
                        | "move-file"
                        | "move-folder";
                    }
                  ? void
                  : C extends {
                        readonly operation: "get-file-description" | "get-folder-description";
                      }
                    ? string | null
                    : C extends {
                          readonly operation:
                            | "get-file-name"
                            | "get-file-mime-type"
                            | "get-folder-name"
                            | "iterator-continuation-token";
                        }
                      ? string
                      : never;
