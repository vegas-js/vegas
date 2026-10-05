import { InMemoryCacheStore } from "../runtime/cache/in-memory-store";
import type { CacheStore } from "../runtime/cache/store";
import { InMemoryDriveIteratorStore } from "../runtime/drive/in-memory-iterator-store";
import { InMemoryDriveStore } from "../runtime/drive/in-memory-store";
import type { DriveIteratorStore } from "../runtime/drive/iterator-store";
import type { DriveStore } from "../runtime/drive/store";
import { InMemoryLockStore } from "../runtime/lock/in-memory-store";
import type { LockStore } from "../runtime/lock/store";
import { InMemoryPropertiesStore } from "../runtime/properties/in-memory-store";
import type { PropertiesStore } from "../runtime/properties/store";
import { InMemorySpreadsheetStore } from "../runtime/spreadsheet/in-memory-store";
import type { SpreadsheetStore } from "../runtime/spreadsheet/store";

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
