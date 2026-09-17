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
      readonly operation: "get-folder";
      readonly id: string;
      readonly resourceKey?: string;
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
  readonly operation: "get-file" | "file-iterator-next";
}
  ? DriveFileReference
  : C extends {
        readonly operation: "get-folder" | "get-root-folder" | "folder-iterator-next";
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
              | "get-folder-folders";
          }
        ? DriveFolderIteratorReference
        : C extends {
              readonly operation: "iterator-has-next";
            }
          ? boolean
          : C extends {
                readonly operation: "iterator-continuation-token";
              }
            ? string
            : never;
