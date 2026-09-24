import type { CacheStore } from "./cache-store";
import type { DriveIteratorStore } from "./drive-iterator-store";
import type { DriveStore } from "./drive-store";
import { InMemoryCacheStore } from "./in-memory-cache-store";
import { InMemoryDriveIteratorStore } from "./in-memory-drive-iterator-store";
import { InMemoryDriveStore } from "./in-memory-drive-store";
import { InMemoryLockStore } from "./in-memory-lock-store";
import { InMemoryPropertiesStore } from "./in-memory-properties-store";
import { InMemorySpreadsheetStore } from "./in-memory-spreadsheet-store";
import type { LockStore } from "./lock-store";
import type { PropertiesStore } from "./properties-store";
import type { SpreadsheetStore } from "./spreadsheet-store";

export interface LocalRuntimeSessionStores {
  readonly cacheStore: CacheStore;
  readonly driveIteratorStore: DriveIteratorStore;
  readonly driveStore: DriveStore;
  readonly lockStore: LockStore;
  readonly propertiesStore: PropertiesStore;
  readonly spreadsheetStore: SpreadsheetStore;
}

interface LocalRuntimeSessionOptions {
  readonly stores?: Partial<LocalRuntimeSessionStores>;
}

function createStores(stores: Partial<LocalRuntimeSessionStores> = {}): LocalRuntimeSessionStores {
  return {
    cacheStore: stores.cacheStore ?? new InMemoryCacheStore(),
    driveIteratorStore: stores.driveIteratorStore ?? new InMemoryDriveIteratorStore(),
    driveStore: stores.driveStore ?? new InMemoryDriveStore(),
    lockStore: stores.lockStore ?? new InMemoryLockStore(),
    propertiesStore: stores.propertiesStore ?? new InMemoryPropertiesStore(),
    spreadsheetStore: stores.spreadsheetStore ?? new InMemorySpreadsheetStore(),
  };
}

export class LocalRuntimeSession {
  readonly stores: LocalRuntimeSessionStores;

  constructor(options: LocalRuntimeSessionOptions = {}) {
    this.stores = createStores(options.stores);
  }
}
