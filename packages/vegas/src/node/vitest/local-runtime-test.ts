import { test as baseTest, type TestAPI } from "vitest";

import {
  createLocalRuntimeHarness,
  loadHarnessProject,
  type HarnessProject,
  type HarnessProjectLoader,
  type LocalRuntimeHarness,
} from "../harness";
import { createRuntimeDataSnapshotFromFixture, type RuntimeDataFixture } from "../runtime-data";

export interface LocalRuntimeTestOptions {
  readonly root?: string;
  readonly runtimeData?: RuntimeDataFixture;
}

interface LocalRuntimeTestDependencies {
  readonly loadHarnessProject: HarnessProjectLoader;
}

function createEnvironmentLoader(
  options: LocalRuntimeTestOptions,
  dependencies: LocalRuntimeTestDependencies,
) {
  let environment: Promise<HarnessProject> | undefined;

  return () => {
    environment ??= dependencies.loadHarnessProject({
      root: options.root,
    });

    return environment;
  };
}

export function createLocalRuntimeTestWithDependencies(
  options: LocalRuntimeTestOptions,
  dependencies: LocalRuntimeTestDependencies,
): TestAPI<{ vegas: LocalRuntimeHarness }> {
  const snapshot = createRuntimeDataSnapshotFromFixture(options.runtimeData);
  const loadEnvironment = createEnvironmentLoader(options, dependencies);

  return baseTest.extend<{ vegas: LocalRuntimeHarness }>({
    vegas: async ({ task }, use) => {
      void task;
      const { project, program } = await loadEnvironment();

      await use(
        await createLocalRuntimeHarness({
          project,
          snapshot,
          program,
        }),
      );
    },
  });
}

export function createLocalRuntimeTest(
  options: LocalRuntimeTestOptions = {},
): TestAPI<{ vegas: LocalRuntimeHarness }> {
  return createLocalRuntimeTestWithDependencies(options, {
    loadHarnessProject,
  });
}
