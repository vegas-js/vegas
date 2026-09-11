// https://developers.google.com/apps-script/reference/drive/file-iterator
export class FileIterator implements GoogleAppsScript.Drive.FileIterator {
  getContinuationToken(): string {
    throw new Error("Method not implemented.");
  }
  hasNext(): boolean {
    throw new Error("Method not implemented.");
  }
  next(): GoogleAppsScript.Drive.File {
    throw new Error("Method not implemented.");
  }
}
