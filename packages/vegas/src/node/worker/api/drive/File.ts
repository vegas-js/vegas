// https://developers.google.com/apps-script/reference/drive/file
export class File implements GoogleAppsScript.Drive.File {
  addCommenter(user: unknown): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  addCommenters(emailAddresses: string[]): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  addEditor(user: unknown): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  addEditors(emailAddresses: string[]): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  addViewer(user: unknown): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  addViewers(emailAddresses: string[]): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  getAccess(user: unknown): GoogleAppsScript.Drive.Permission {
    throw new Error("Method not implemented.");
  }
  getAs(contentType: string): GoogleAppsScript.Base.Blob {
    throw new Error("Method not implemented.");
  }
  getBlob(): GoogleAppsScript.Base.Blob {
    throw new Error("Method not implemented.");
  }
  getDateCreated(): GoogleAppsScript.Base.Date {
    throw new Error("Method not implemented.");
  }
  getDescription(): string | null {
    throw new Error("Method not implemented.");
  }
  getDownloadUrl(): string {
    throw new Error("Method not implemented.");
  }
  getEditors(): GoogleAppsScript.Drive.User[] {
    throw new Error("Method not implemented.");
  }
  getId(): string {
    throw new Error("Method not implemented.");
  }
  getLastUpdated(): GoogleAppsScript.Base.Date {
    throw new Error("Method not implemented.");
  }
  getMimeType(): string {
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
  getTargetId(): string | null {
    throw new Error("Method not implemented.");
  }
  getTargetMimeType(): string | null {
    throw new Error("Method not implemented.");
  }
  getTargetResourceKey(): string | null {
    throw new Error("Method not implemented.");
  }
  getThumbnail(): GoogleAppsScript.Base.Blob {
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
  makeCopy(name?: unknown, destination?: unknown): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  moveTo(destination: GoogleAppsScript.Drive.Folder): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  removeCommenter(user: unknown): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  removeEditor(user: unknown): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  removeViewer(user: unknown): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  revokePermissions(user: unknown): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  setContent(content: string): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  setDescription(description: string): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  setName(name: string): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  setOwner(user: unknown): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  setSecurityUpdateEnabled(enabled: boolean): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  setShareableByEditors(shareable: boolean): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  setSharing(
    accessType: GoogleAppsScript.Drive.Access,
    permissionType: GoogleAppsScript.Drive.Permission,
  ): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  setStarred(starred: boolean): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
  setTrashed(trashed: boolean): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
}
