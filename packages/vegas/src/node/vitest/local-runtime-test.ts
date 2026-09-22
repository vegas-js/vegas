import { test as baseTest, type TestAPI } from "vitest";

import {
  createLocalRuntimeHarness,
  type LocalRuntimeHarness,
  type LocalRuntimeHarnessOptions,
} from "../local-runtime-harness";

export function createLocalRuntimeTest(
  options: LocalRuntimeHarnessOptions,
): TestAPI<{ vegas: LocalRuntimeHarness }> {
  return baseTest.extend<{ vegas: LocalRuntimeHarness }>({
    vegas: async ({ task }, use) => {
      void task;
      await use(await createLocalRuntimeHarness(options));
    },
  });
}
