import { expect, test } from "vitest";

import { RuntimeScope } from "../scope";
import type { RuntimeHostDependencies } from "./registry";
import { createRuntimeServiceRegistry } from "./registry";

function createDependencies(
  overrides: Partial<RuntimeHostDependencies> = {},
): RuntimeHostDependencies {
  return {
    spreadsheetStore: new Map(),
    cacheStore: {
      document: {},
      script: {},
      user: {},
    },
    propertiesStore: {
      document: {},
      script: {},
      user: {},
    },
    sessionEnvironment: {
      executeAs: "USER_ACCESSING",
    },
    clock: { now: () => 0 },
    ...overrides,
  };
}

test("dependency wiring", () => {
  const dependencies = createDependencies();
  const registry = createRuntimeServiceRegistry(dependencies);

  expect(registry.Range).toBeDefined();
  expect(registry.Session).toBeDefined();
  expect(registry.Cache).toBeDefined();
  expect(registry.Properties).toBeDefined();
});

test("dependency injection", async () => {
  const basetime = 10;
  const dependencies = createDependencies({
    clock: { now: () => basetime },
  });
  const registry = createRuntimeServiceRegistry(dependencies);
  const expired = 10;
  await registry.Cache.put(RuntimeScope.SCRIPT, "key", "value", expired);

  expect(dependencies.cacheStore.script["key"].expired).toBe(basetime + expired * 1000);
});
