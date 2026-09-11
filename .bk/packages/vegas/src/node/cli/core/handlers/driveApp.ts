import { ServeContext } from "../context";

export class DriveAppHandler {
  addFile(ctx: ServeContext, payload: any) {}
  continueFileIterator(ctx: ServeContext, payload: any) {}
  continueFolderIterator(ctx: ServeContext, payload: any) {}
  createFile(ctx: ServeContext, payload: any) {}
  createFolder(ctx: ServeContext, payload: any) {}
  createShortcut(ctx: ServeContext, payload: any) {}
  createShortcutForTargetIdAndResourceKey(ctx: ServeContext, payload: any) {}
  getFileById(ctx: ServeContext, payload: any) {}
  addFogetFileByIdAndResourceKeylder(ctx: ServeContext, payload: any) {}
  getFiles(ctx: ServeContext, payload: any) {}
  getFilesByName(ctx: ServeContext, payload: any) {}
  getFilesByType(ctx: ServeContext, payload: any) {}
  getFolderById(ctx: ServeContext, payload: any) {}
  getFolderByIdAndResourceKey(ctx: ServeContext, payload: any) {}
  getFolders(ctx: ServeContext, payload: any) {}
  getFoldersByName(ctx: ServeContext, payload: any) {}
  getRootFolder(ctx: ServeContext, payload: any) {}
  getStorageLimit(ctx: ServeContext, payload: any) {}
  getStorageUsed(ctx: ServeContext, payload: any) {}
  getTrashedFiles(ctx: ServeContext, payload: any) {}
  getTrashedFolders(ctx: ServeContext, payload: any) {}
  removeFile(ctx: ServeContext, payload: any) {}
  removeFolder(ctx: ServeContext, payload: any) {}
  searchFiles(ctx: ServeContext, payload: any) {}
  searchFolders(ctx: ServeContext, payload: any) {}
}
