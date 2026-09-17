import type { BlobValue } from "./blob-value";
import type {
  DriveFileIteratorReference,
  DriveFileReference,
  DriveFolderIteratorReference,
  DriveFolderReference,
  DriveIteratorReference,
} from "./drive-reference";

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
      readonly operation: "get-file-blob";
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
      readonly operation: "set-file-content";
      readonly file: DriveFileReference;
      readonly content: string;
    }
  | {
      readonly service: "drive";
      readonly operation: "set-file-name";
      readonly file: DriveFileReference;
      readonly name: string;
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
      readonly operation: "get-folder-name";
      readonly folder: DriveFolderReference;
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
      readonly operation: "get-folders";
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
  readonly operation: "get-file" | "create-file" | "file-iterator-next";
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
          readonly operation: "get-files" | "continue-file-iterator" | "get-folder-files";
        }
      ? DriveFileIteratorReference
      : C extends {
            readonly operation:
              | "get-folders"
              | "continue-folder-iterator"
              | "get-file-parents"
              | "get-folder-folders"
              | "get-folder-parents";
          }
        ? DriveFolderIteratorReference
        : C extends {
              readonly operation: "get-file-blob";
            }
          ? BlobValue
          : C extends {
                readonly operation: "iterator-has-next";
              }
            ? boolean
            : C extends {
                  readonly operation: "set-file-content" | "set-file-name";
                }
              ? void
              : C extends {
                    readonly operation:
                      | "get-file-name"
                      | "get-file-mime-type"
                      | "get-folder-name"
                      | "iterator-continuation-token";
                  }
                ? string
                : never;
