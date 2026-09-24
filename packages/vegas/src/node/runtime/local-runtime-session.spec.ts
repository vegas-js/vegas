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

  test("use provided stores with defaults for omitted stores", () => {
    const propertiesStore = new InMemoryPropertiesStore();
    const spreadsheetStore = new InMemorySpreadsheetStore();
    const session = new LocalRuntimeSession({
      stores: {
        propertiesStore,
        spreadsheetStore,
      },
    });

    expect(session.stores.cacheStore).toBeInstanceOf(InMemoryCacheStore);
    expect(session.stores.driveIteratorStore).toBeInstanceOf(InMemoryDriveIteratorStore);
    expect(session.stores.driveStore).toBeInstanceOf(InMemoryDriveStore);
    expect(session.stores.lockStore).toBeInstanceOf(InMemoryLockStore);
    expect(session.stores.propertiesStore).toBe(propertiesStore);
    expect(session.stores.spreadsheetStore).toBe(spreadsheetStore);
  });
});
