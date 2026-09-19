import type { DriveIteratorSession } from "./drive-iterator-store";
import type {
  DriveFileIteratorReference,
  DriveFileReference,
  DriveFolderIteratorReference,
  DriveFolderReference,
  DriveIteratorReference,
} from "./drive-reference";
import type { DriveNamespace } from "./drive-store";

type IteratorState<T> = {
  readonly values: readonly T[];
  index: number;
};

export type DriveIteratorContinuationState =
  | {
      readonly kind: "file";
      readonly state: IteratorState<DriveFileReference>;
    }
  | {
      readonly kind: "folder";
      readonly state: IteratorState<DriveFolderReference>;
    };

function cloneFileReference(reference: DriveFileReference): DriveFileReference {
  return { ...reference };
}

function cloneFolderReference(reference: DriveFolderReference): DriveFolderReference {
  return { ...reference };
}

function cloneFileState(
  state: IteratorState<DriveFileReference>,
): IteratorState<DriveFileReference> {
  return {
    values: state.values.map(cloneFileReference),
    index: state.index,
  };
}

function cloneFolderState(
  state: IteratorState<DriveFolderReference>,
): IteratorState<DriveFolderReference> {
  return {
    values: state.values.map(cloneFolderReference),
    index: state.index,
  };
}

export function cloneDriveIteratorContinuationState(
  state: DriveIteratorContinuationState,
): DriveIteratorContinuationState {
  switch (state.kind) {
    case "file": {
      return { kind: "file", state: cloneFileState(state.state) };
    }
    case "folder": {
      return { kind: "folder", state: cloneFolderState(state.state) };
    }
  }
}

export class InMemoryDriveIteratorSession implements DriveIteratorSession {
  readonly #sessionId: number;
  readonly #namespace: DriveNamespace;
  readonly #saveContinuation: (
    namespace: DriveNamespace,
    state: DriveIteratorContinuationState,
  ) => string;
  readonly #loadContinuation: (
    namespace: DriveNamespace,
    token: string,
  ) => DriveIteratorContinuationState;
  readonly #fileIterators = new Map<string, IteratorState<DriveFileReference>>();
  readonly #folderIterators = new Map<string, IteratorState<DriveFolderReference>>();
  #nextHandleId = 0;

  constructor(
    sessionId: number,
    namespace: DriveNamespace,
    saveContinuation: (namespace: DriveNamespace, state: DriveIteratorContinuationState) => string,
    loadContinuation: (namespace: DriveNamespace, token: string) => DriveIteratorContinuationState,
  ) {
    this.#sessionId = sessionId;
    this.#namespace = namespace;
    this.#saveContinuation = saveContinuation;
    this.#loadContinuation = loadContinuation;
  }

  async createFileIterator(
    values: readonly DriveFileReference[],
  ): Promise<DriveFileIteratorReference> {
    return this.#createFileIterator({
      values: values.map(cloneFileReference),
      index: 0,
    });
  }

  async createFolderIterator(
    values: readonly DriveFolderReference[],
  ): Promise<DriveFolderIteratorReference> {
    return this.#createFolderIterator({
      values: values.map(cloneFolderReference),
      index: 0,
    });
  }

  async continueFileIterator(continuationToken: string): Promise<DriveFileIteratorReference> {
    const continuation = this.#loadContinuation(this.#namespace, continuationToken);

    if (continuation.kind !== "file") {
      throw new Error("Drive continuation token is not for a file iterator.");
    }

    return this.#createFileIterator(cloneFileState(continuation.state));
  }

  async continueFolderIterator(continuationToken: string): Promise<DriveFolderIteratorReference> {
    const continuation = this.#loadContinuation(this.#namespace, continuationToken);

    if (continuation.kind !== "folder") {
      throw new Error("Drive continuation token is not for a folder iterator.");
    }

    return this.#createFolderIterator(cloneFolderState(continuation.state));
  }

  async getContinuationToken(iterator: DriveIteratorReference): Promise<string> {
    switch (iterator.kind) {
      case "file-iterator": {
        return this.#saveContinuation(this.#namespace, {
          kind: "file",
          state: cloneFileState(this.#getFileState(iterator)),
        });
      }
      case "folder-iterator": {
        return this.#saveContinuation(this.#namespace, {
          kind: "folder",
          state: cloneFolderState(this.#getFolderState(iterator)),
        });
      }
    }
  }

  async hasNext(iterator: DriveIteratorReference): Promise<boolean> {
    switch (iterator.kind) {
      case "file-iterator": {
        const state = this.#getFileState(iterator);
        return state.index < state.values.length;
      }
      case "folder-iterator": {
        const state = this.#getFolderState(iterator);
        return state.index < state.values.length;
      }
    }
  }

  async nextFile(iterator: DriveFileIteratorReference): Promise<DriveFileReference> {
    const state = this.#getFileState(iterator);
    const value = state.values[state.index];

    if (!value) {
      throw new Error("Drive file iterator has no next value.");
    }

    state.index += 1;
    return cloneFileReference(value);
  }

  async nextFolder(iterator: DriveFolderIteratorReference): Promise<DriveFolderReference> {
    const state = this.#getFolderState(iterator);
    const value = state.values[state.index];

    if (!value) {
      throw new Error("Drive folder iterator has no next value.");
    }

    state.index += 1;
    return cloneFolderReference(value);
  }

  #createFileIterator(state: IteratorState<DriveFileReference>): DriveFileIteratorReference {
    const handle = this.#createHandle("file");
    this.#fileIterators.set(handle, state);
    return { service: "drive", kind: "file-iterator", handle };
  }

  #createFolderIterator(state: IteratorState<DriveFolderReference>): DriveFolderIteratorReference {
    const handle = this.#createHandle("folder");
    this.#folderIterators.set(handle, state);
    return { service: "drive", kind: "folder-iterator", handle };
  }

  #createHandle(kind: "file" | "folder"): string {
    this.#nextHandleId += 1;
    return `drive-${kind}-iterator:${this.#sessionId}:${this.#nextHandleId}`;
  }

  #getFileState(iterator: DriveFileIteratorReference): IteratorState<DriveFileReference> {
    const state = this.#fileIterators.get(iterator.handle);

    if (!state) {
      throw new Error(`Unknown Drive file iterator handle: ${iterator.handle}`);
    }

    return state;
  }

  #getFolderState(iterator: DriveFolderIteratorReference): IteratorState<DriveFolderReference> {
    const state = this.#folderIterators.get(iterator.handle);

    if (!state) {
      throw new Error(`Unknown Drive folder iterator handle: ${iterator.handle}`);
    }

    return state;
  }
}
