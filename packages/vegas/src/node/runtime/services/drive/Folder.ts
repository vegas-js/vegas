// https://developers.google.com/apps-script/reference/drive/folder
export class Folder implements GoogleAppsScript.Drive.Folder {
  addEditor(user: unknown): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  addEditors(emailAddresses: string[]): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  addFile(child: GoogleAppsScript.Drive.File): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  addFolder(child: GoogleAppsScript.Drive.Folder): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  addViewer(user: unknown): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  addViewers(emailAddresses: string[]): GoogleAppsScript.Drive.Folder {
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
  getAccess(user: unknown): GoogleAppsScript.Drive.Permission {
    throw new Error("Method not implemented.");
  }
  getDateCreated(): GoogleAppsScript.Base.Date {
    throw new Error("Method not implemented.");
  }
  getDescription(): string | null {
    throw new Error("Method not implemented.");
  }
  getEditors(): GoogleAppsScript.Drive.User[] {
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
  getFolders(): GoogleAppsScript.Drive.FolderIterator {
    throw new Error("Method not implemented.");
  }
  getFoldersByName(name: string): GoogleAppsScript.Drive.FolderIterator {
    throw new Error("Method not implemented.");
  }
  getId(): string {
    throw new Error("Method not implemented.");
  }
  getLastUpdated(): GoogleAppsScript.Base.Date {
    throw new Error("Method not implemented.");
  }
  getName(): string {
    throw new Error("Method not implemented.");
  }
  getOwner(): GoogleAppsScript.Drive.User {
    throw new Error("Method not implemented.");
  }
  getParents(): GoogleAppsScript.Drive.FolderIterator {
    throw new Error("Method not implemented.");
  }
  getResourceKey(): string | null {
    throw new Error("Method not implemented.");
  }
  getSecurityUpdateEligible(): boolean {
    throw new Error("Method not implemented.");
  }
  getSecurityUpdateEnabled(): boolean {
    throw new Error("Method not implemented.");
  }
  getSharingAccess(): GoogleAppsScript.Drive.Access {
    throw new Error("Method not implemented.");
  }
  getSharingPermission(): GoogleAppsScript.Drive.Permission {
    throw new Error("Method not implemented.");
  }
  getSize(): GoogleAppsScript.Integer {
    throw new Error("Method not implemented.");
  }
  getUrl(): string {
    throw new Error("Method not implemented.");
  }
  getViewers(): GoogleAppsScript.Drive.User[] {
    throw new Error("Method not implemented.");
  }
  isShareableByEditors(): boolean {
    throw new Error("Method not implemented.");
  }
  isStarred(): boolean {
    throw new Error("Method not implemented.");
  }
  isTrashed(): boolean {
    throw new Error("Method not implemented.");
  }
  moveTo(destination: GoogleAppsScript.Drive.Folder): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  removeEditor(user: unknown): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  removeFile(child: GoogleAppsScript.Drive.File): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  removeFolder(child: GoogleAppsScript.Drive.Folder): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  removeViewer(user: unknown): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  revokePermissions(user: unknown): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  searchFiles(params: string): GoogleAppsScript.Drive.FileIterator {
    throw new Error("Method not implemented.");
  }
  searchFolders(params: string): GoogleAppsScript.Drive.FolderIterator {
    throw new Error("Method not implemented.");
  }
  setDescription(description: string): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  setName(name: string): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  setOwner(user: unknown): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  setSecurityUpdateEnabled(enabled: boolean): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  setShareableByEditors(shareable: boolean): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  setSharing(
    accessType: GoogleAppsScript.Drive.Access,
    permissionType: GoogleAppsScript.Drive.Permission,
  ): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  setStarred(starred: boolean): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
  setTrashed(trashed: boolean): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
}
