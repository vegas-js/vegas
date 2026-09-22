import { test as baseTest, type TestAPI } from "vitest";

import { createLocalRuntimeHarness, type LocalRuntimeHarness } from "../local-runtime-harness";
import type { LocalRuntimeProject } from "../local-runtime-project";
import type { Program } from "../runtime";
import {
  createRuntimeDataSnapshotFromFixture,
  type RuntimeDataFixture,
} from "../runtime-data-fixture";

export interface LocalRuntimeTestOptions {
  readonly project: LocalRuntimeProject;
  readonly runtimeData?: RuntimeDataFixture;
  readonly program: Program;
}

export function createLocalRuntimeTest(
  options: LocalRuntimeTestOptions,
): TestAPI<{ vegas: LocalRuntimeHarness }> {
  const snapshot = createRuntimeDataSnapshotFromFixture(options.runtimeData);

  return baseTest.extend<{ vegas: LocalRuntimeHarness }>({
    vegas: async ({ task }, use) => {
      void task;
      await use(
        await createLocalRuntimeHarness({
          project: options.project,
          snapshot,
          program: options.program,
        }),
      );
    },
  });
}
