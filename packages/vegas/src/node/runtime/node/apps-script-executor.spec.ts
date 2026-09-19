import { describe, expect, expectTypeOf, test } from "vitest";

import {
  InMemoryCacheStore,
  InMemoryDriveIteratorStore,
  InMemoryDriveStore,
  InMemoryLockStore,
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  type Executor,
} from "../index";
import { createNodeAppsScriptExecutor } from "./apps-script-executor";

describe("createNodeAppsScriptExecutor", () => {
  test("compose an Executor from named store dependencies", () => {
    const executor = createNodeAppsScriptExecutor({
      cacheStore: new InMemoryCacheStore(),
      driveIteratorStore: new InMemoryDriveIteratorStore(),
      driveStore: new InMemoryDriveStore(),
      lockStore: new InMemoryLockStore(),
      propertiesStore: new InMemoryPropertiesStore(),
      spreadsheetStore: new InMemorySpreadsheetStore(),
    });

    expectTypeOf(executor).toEqualTypeOf<Executor>();
    expect(executor.execute).toBeTypeOf("function");
  });
});
