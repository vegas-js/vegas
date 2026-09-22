import type { DriveHostCall, DriveHostCallResult } from "./drive-host-call";
import type { DriveIteratorSession } from "./drive-iterator-store";
import type { DriveFileReference, DriveFolderReference } from "./drive-reference";
import type { DriveNamespace, DriveStore } from "./drive-store";
import { unsupportedHostCall } from "./unsupported-host-call";

const MAX_LOCAL_DRIVE_FILE_CONTENT_BYTES = 10_000_000;

async function filterFilesByName(
  store: DriveStore,
  namespace: DriveNamespace,
  files: readonly DriveFileReference[],
  name: string,
): Promise<readonly DriveFileReference[]> {
  const matches: DriveFileReference[] = [];

  for (const file of files) {
    const metadata = await store.getFileMetadata(namespace, file);
    if (metadata.name === name) {
      matches.push(file);
    }
  }

  return matches;
}

async function filterFilesByType(
  store: DriveStore,
  namespace: DriveNamespace,
  files: readonly DriveFileReference[],
  mimeType: string,
): Promise<readonly DriveFileReference[]> {
  const matches: DriveFileReference[] = [];

  for (const file of files) {
    const metadata = await store.getFileMetadata(namespace, file);
    if (metadata.mimeType === mimeType) {
      matches.push(file);
    }
  }

  return matches;
}

async function filterFoldersByName(
  store: DriveStore,
  namespace: DriveNamespace,
  folders: readonly DriveFolderReference[],
  name: string,
): Promise<readonly DriveFolderReference[]> {
  const matches: DriveFolderReference[] = [];

  for (const folder of folders) {
    if ((await store.getFolderName(namespace, folder)) === name) {
      matches.push(folder);
    }
  }

  return matches;
}

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
  readonly #namespace: DriveNamespace;
  readonly #iterators: DriveIteratorSession;

  constructor(store: DriveStore, namespace: DriveNamespace, iterators: DriveIteratorSession) {
    this.#store = store;
    this.#namespace = namespace;
    this.#iterators = iterators;
  }

  async handle(call: DriveHostCall): Promise<DriveHostCallResult<DriveHostCall>> {
    switch (call.operation) {
      case "get-file": {
        return this.#store.getFile(this.#namespace, call.id, call.resourceKey);
      }
      case "create-file": {
        return this.#store.createFile(this.#namespace, call.parent, call.blob);
      }
      case "create-shortcut": {
        return this.#store.createShortcut(
          this.#namespace,
          call.parent,
          call.targetId,
          call.targetResourceKey,
        );
      }
      case "get-file-blob": {
        return this.#store.getFileBlob(this.#namespace, call.file);
      }
      case "get-file-name": {
        const { name } = await this.#store.getFileMetadata(this.#namespace, call.file);

        if (name === null) {
          throw new Error(`Local Drive file name is unavailable: ${call.file.id}`);
        }

        return name;
      }
      case "get-file-mime-type": {
        const { mimeType } = await this.#store.getFileMetadata(this.#namespace, call.file);

        if (mimeType === null) {
          throw new Error(`Local Drive file MIME type is unavailable: ${call.file.id}`);
        }

        return mimeType;
      }
      case "get-file-shortcut-target": {
        return this.#store.getFileShortcutTarget(this.#namespace, call.file);
      }
      case "get-file-trashed": {
        return this.#store.isFileTrashed(this.#namespace, call.file);
      }
      case "set-file-trashed": {
        await this.#store.setFileTrashed(this.#namespace, call.file, call.trashed);
        return;
      }
      case "set-file-content": {
        const encoded = new TextEncoder().encode(call.content);

        if (encoded.byteLength > MAX_LOCAL_DRIVE_FILE_CONTENT_BYTES) {
          throw new Error("Local Drive file content exceeds the 10 MB limit.");
        }

        await this.#store.setFileContent(this.#namespace, call.file, Array.from(encoded));
        return;
      }
      case "set-file-name": {
        await this.#store.setFileName(this.#namespace, call.file, call.name);
        return;
      }
      case "move-file": {
        await this.#store.moveFile(this.#namespace, call.file, call.destination);
        return;
      }
      case "get-folder": {
        return this.#store.getFolder(this.#namespace, call.id, call.resourceKey);
      }
      case "create-folder": {
        return this.#store.createFolder(this.#namespace, call.parent, call.name);
      }
      case "get-folder-name": {
        const name = await this.#store.getFolderName(this.#namespace, call.folder);

        if (name === null) {
          throw new Error(`Local Drive folder name is unavailable: ${call.folder.id}`);
        }

        return name;
      }
      case "move-folder": {
        await this.#store.moveFolder(this.#namespace, call.folder, call.destination);
        return;
      }
      case "set-folder-name": {
        await this.#store.setFolderName(this.#namespace, call.folder, call.name);
        return;
      }
      case "get-folder-trashed": {
        return this.#store.isFolderTrashed(this.#namespace, call.folder);
      }
      case "set-folder-trashed": {
        await this.#store.setFolderTrashed(this.#namespace, call.folder, call.trashed);
        return;
      }
      case "get-root-folder": {
        return this.#store.getRootFolder(this.#namespace);
      }
      case "get-files": {
        return this.#iterators.createFileIterator(await this.#store.listFiles(this.#namespace));
      }
      case "get-trashed-files": {
        return this.#iterators.createFileIterator(
          await this.#store.listTrashedFiles(this.#namespace),
        );
      }
      case "get-files-by-name": {
        const files =
          call.folder === undefined
            ? await this.#store.listFiles(this.#namespace)
            : await this.#store.listFolderFiles(this.#namespace, call.folder);

        return this.#iterators.createFileIterator(
          await filterFilesByName(this.#store, this.#namespace, files, call.name),
        );
      }
      case "get-files-by-type": {
        const files =
          call.folder === undefined
            ? await this.#store.listFiles(this.#namespace)
            : await this.#store.listFolderFiles(this.#namespace, call.folder);

        return this.#iterators.createFileIterator(
          await filterFilesByType(this.#store, this.#namespace, files, call.mimeType),
        );
      }
      case "get-folders": {
        return this.#iterators.createFolderIterator(await this.#store.listFolders(this.#namespace));
      }
      case "get-trashed-folders": {
        return this.#iterators.createFolderIterator(
          await this.#store.listTrashedFolders(this.#namespace),
        );
      }
      case "get-folders-by-name": {
        const folders =
          call.folder === undefined
            ? await this.#store.listFolders(this.#namespace)
            : await this.#store.listFolderFolders(this.#namespace, call.folder);

        return this.#iterators.createFolderIterator(
          await filterFoldersByName(this.#store, this.#namespace, folders, call.name),
        );
      }
      case "continue-file-iterator": {
        return this.#iterators.continueFileIterator(call.continuationToken);
      }
      case "continue-folder-iterator": {
        return this.#iterators.continueFolderIterator(call.continuationToken);
      }
      case "get-file-parents": {
        return this.#iterators.createFolderIterator(
          await this.#store.listFileParents(this.#namespace, call.file),
        );
      }
      case "get-folder-files": {
        return this.#iterators.createFileIterator(
          await this.#store.listFolderFiles(this.#namespace, call.folder),
        );
      }
      case "get-folder-folders": {
        return this.#iterators.createFolderIterator(
          await this.#store.listFolderFolders(this.#namespace, call.folder),
        );
      }
      case "get-folder-parents": {
        return this.#iterators.createFolderIterator(
          await this.#store.listFolderParents(this.#namespace, call.folder),
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

    return unsupportedHostCall(call);
  }
}
