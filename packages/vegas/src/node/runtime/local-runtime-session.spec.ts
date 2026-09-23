import { describe, expect, test } from "vitest";

import { InMemoryCacheStore } from "./in-memory-cache-store";
import { InMemoryDriveIteratorStore } from "./in-memory-drive-iterator-store";
import { InMemoryDriveStore } from "./in-memory-drive-store";
import { InMemoryLockStore } from "./in-memory-lock-store";
import { InMemoryPropertiesStore } from "./in-memory-properties-store";
import { InMemorySpreadsheetStore } from "./in-memory-spreadsheet-store";
import { LocalRuntimeSession } from "./local-runtime-session";

describe("LocalRuntimeSession", () => {
  test("own isolated default stores", () => {
    const first = new LocalRuntimeSession();
    const second = new LocalRuntimeSession();

    expect(first.stores.cacheStore).not.toBe(second.stores.cacheStore);
    expect(first.stores.driveIteratorStore).not.toBe(second.stores.driveIteratorStore);
    expect(first.stores.driveStore).not.toBe(second.stores.driveStore);
    expect(first.stores.lockStore).not.toBe(second.stores.lockStore);
    expect(first.stores.propertiesStore).not.toBe(second.stores.propertiesStore);
    expect(first.stores.spreadsheetStore).not.toBe(second.stores.spreadsheetStore);
  });

  test("use provided stores", () => {
    const stores = {
      cacheStore: new InMemoryCacheStore(),
      driveIteratorStore: new InMemoryDriveIteratorStore(),
      driveStore: new InMemoryDriveStore(),
      lockStore: new InMemoryLockStore(),
      propertiesStore: new InMemoryPropertiesStore(),
      spreadsheetStore: new InMemorySpreadsheetStore(),
    };

    expect(new LocalRuntimeSession({ stores }).stores).toBe(stores);
  });
});
