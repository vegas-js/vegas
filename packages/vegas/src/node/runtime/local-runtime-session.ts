import type { CacheStore } from "./cache-store";
import type { DriveIteratorStore } from "./drive-iterator-store";
import type { DriveStore } from "./drive-store";
import { InMemoryCacheStore } from "./in-memory-cache-store";
import { InMemoryDriveIteratorStore } from "./in-memory-drive-iterator-store";
import { InMemoryDriveStore } from "./in-memory-drive-store";
import { InMemoryLockStore } from "./in-memory-lock-store";
import type { LockStore } from "./lock-store";

export interface LocalRuntimeSessionStores {
  readonly cacheStore: CacheStore;
  readonly driveIteratorStore: DriveIteratorStore;
  readonly driveStore: DriveStore;
  readonly lockStore: LockStore;
}

interface LocalRuntimeSessionOptions {
  readonly stores?: LocalRuntimeSessionStores;
}

function createDefaultStores(): LocalRuntimeSessionStores {
  return {
    cacheStore: new InMemoryCacheStore(),
    driveIteratorStore: new InMemoryDriveIteratorStore(),
    driveStore: new InMemoryDriveStore(),
    lockStore: new InMemoryLockStore(),
  };
}

export class LocalRuntimeSession {
  readonly stores: LocalRuntimeSessionStores;

  constructor(options: LocalRuntimeSessionOptions = {}) {
    this.stores = options.stores ?? createDefaultStores();
  }
}
