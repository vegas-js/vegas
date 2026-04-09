// https://developers.google.com/apps-script/reference/drive/folder-iterator
export class FolderIterator implements GoogleAppsScript.Drive.FolderIterator {
  getContinuationToken(): string {
    throw new Error("Method not implemented.");
  }
  hasNext(): boolean {
    throw new Error("Method not implemented.");
  }
  next(): GoogleAppsScript.Drive.Folder {
    throw new Error("Method not implemented.");
  }
}
