import { CreateFile, CreateFolder, RequestSync } from "../..";

// https://developers.google.com/apps-script/reference/drive/drive-app
export class DriveApp implements GoogleAppsScript.Drive.DriveApp {
  #createFile: CreateFile;
  #createFolder: CreateFolder;
  #requestSync: RequestSync;

  constructor(createFile: CreateFile, createFolder: CreateFolder, requestSync: RequestSync) {
    this.#createFile = createFile;
    this.#createFolder = createFolder;
    this.#requestSync = requestSync;
  }

  Access = {
    ANYONE: 0,
    ANYONE_WITH_LINK: 1,
    DOMAIN: 2,
    DOMAIN_WITH_LINK: 3,
    PRIVATE: 4,
  };
  Permission = {
    VIEW: 0,
    EDIT: 1,
    COMMENT: 2,
    OWNER: 3,
    ORGANIZER: 4,
    NONE: 5,
  };

  addFile(child: GoogleAppsScript.Drive.File): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  addFolder(child: GoogleAppsScript.Drive.Folder): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  continueFileIterator(continuationToken: string): GoogleAppsScript.Drive.FileIterator {
    throw new Error("Method not implemented.");
  }
  continueFolderIterator(continuationToken: string): GoogleAppsScript.Drive.FolderIterator {
    throw new Error("Method not implemented.");
  }
  createFile(name: unknown, content?: unknown, mimeType?: unknown): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  createFolder(name: string): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  createShortcut(targetId: string): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  createShortcutForTargetIdAndResourceKey(
    targetId: string,
    targetResourceKey: string,
  ): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  getFileById(id: string): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  getFileByIdAndResourceKey(id: string, resourceKey: string): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  getFiles(): GoogleAppsScript.Drive.FileIterator {
    throw new Error("Method not implemented.");
  }
  getFilesByName(name: string): GoogleAppsScript.Drive.FileIterator {
    throw new Error("Method not implemented.");
  }
  getFilesByType(mimeType: string): GoogleAppsScript.Drive.FileIterator {
    throw new Error("Method not implemented.");
  }
  getFolderById(id: string): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  getFolderByIdAndResourceKey(id: string, resourceKey: string): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  getFolders(): GoogleAppsScript.Drive.FolderIterator {
    throw new Error("Method not implemented.");
  }
  getFoldersByName(name: string): GoogleAppsScript.Drive.FolderIterator {
    throw new Error("Method not implemented.");
  }
  getRootFolder(): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  getStorageLimit(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getStorageUsed(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getTrashedFiles(): GoogleAppsScript.Drive.FileIterator {
    throw new Error("Method not implemented.");
  }
  getTrashedFolders(): GoogleAppsScript.Drive.FolderIterator {
    throw new Error("Method not implemented.");
  }
  removeFile(child: GoogleAppsScript.Drive.File): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  removeFolder(child: GoogleAppsScript.Drive.Folder): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  searchFiles(params: string): GoogleAppsScript.Drive.FileIterator {
    throw new Error("Method not implemented.");
  }
  searchFolders(params: string): GoogleAppsScript.Drive.FolderIterator {
    throw new Error("Method not implemented.");
  }
}
