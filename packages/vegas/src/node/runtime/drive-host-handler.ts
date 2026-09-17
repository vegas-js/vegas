import type { DriveHostCall, DriveHostCallResult } from "./drive-host-call";
import type { DriveIteratorSession } from "./drive-iterator-store";
import type { DriveStore } from "./drive-store";

export interface DriveHostCallHandler {
  handle(call: DriveHostCall): Promise<DriveHostCallResult<DriveHostCall>>;
}

/**
 * Handles Drive calls against the local virtual Drive.
 *
 * One instance is intended for one invocation so its DriveIteratorSession owns
 * only the iterator handles created by that invocation.
 */
export class LocalDriveHostHandler implements DriveHostCallHandler {
  readonly #store: DriveStore;
  readonly #iterators: DriveIteratorSession;

  constructor(store: DriveStore, iterators: DriveIteratorSession) {
    this.#store = store;
    this.#iterators = iterators;
  }

  async handle(call: DriveHostCall): Promise<DriveHostCallResult<DriveHostCall>> {
    switch (call.operation) {
      case "get-file": {
        return this.#store.getFile(call.id, call.resourceKey);
      }
      case "get-folder": {
        return this.#store.getFolder(call.id, call.resourceKey);
      }
      case "get-root-folder": {
        return this.#store.getRootFolder();
      }
      case "get-files": {
        return this.#iterators.createFileIterator(await this.#store.listFiles());
      }
      case "get-folders": {
        return this.#iterators.createFolderIterator(await this.#store.listFolders());
      }
      case "continue-file-iterator": {
        return this.#iterators.continueFileIterator(call.continuationToken);
      }
      case "continue-folder-iterator": {
        return this.#iterators.continueFolderIterator(call.continuationToken);
      }
      case "get-file-parents": {
        return this.#iterators.createFolderIterator(await this.#store.listFileParents(call.file));
      }
      case "get-folder-files": {
        return this.#iterators.createFileIterator(await this.#store.listFolderFiles(call.folder));
      }
      case "get-folder-folders": {
        return this.#iterators.createFolderIterator(
          await this.#store.listFolderFolders(call.folder),
        );
      }
      case "iterator-has-next": {
        return this.#iterators.hasNext(call.iterator);
      }
      case "iterator-continuation-token": {
        return this.#iterators.getContinuationToken(call.iterator);
      }
      case "file-iterator-next": {
        return this.#iterators.nextFile(call.iterator);
      }
      case "folder-iterator-next": {
        return this.#iterators.nextFolder(call.iterator);
      }
    }
  }
}
