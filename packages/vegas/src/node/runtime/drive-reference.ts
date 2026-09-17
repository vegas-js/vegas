// https://developers.google.com/apps-script/reference/drive/file
export interface DriveFileReference {
  readonly service: "drive";
  readonly kind: "file";
  readonly id: string;
  readonly resourceKey?: string;
}

// https://developers.google.com/apps-script/reference/drive/folder
export interface DriveFolderReference {
  readonly service: "drive";
  readonly kind: "folder";
  readonly id: string;
  readonly resourceKey?: string;
}

// https://developers.google.com/apps-script/reference/drive/file-iterator
export interface DriveFileIteratorReference {
  readonly service: "drive";
  readonly kind: "file-iterator";
  /**
   * Runtime-internal opaque iterator handle.
   *
   * This is intentionally distinct from the Apps Script continuation token.
   */
  readonly handle: string;
}

// https://developers.google.com/apps-script/reference/drive/folder-iterator
export interface DriveFolderIteratorReference {
  readonly service: "drive";
  readonly kind: "folder-iterator";
  /**
   * Runtime-internal opaque iterator handle.
   *
   * This is intentionally distinct from the Apps Script continuation token.
   */
  readonly handle: string;
}

export type DriveResourceReference = DriveFileReference | DriveFolderReference;

export type DriveIteratorReference = DriveFileIteratorReference | DriveFolderIteratorReference;

export type DriveObjectReference = DriveResourceReference | DriveIteratorReference;
