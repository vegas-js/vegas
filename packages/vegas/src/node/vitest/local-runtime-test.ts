import { test as baseTest, type TestAPI } from "vitest";

import { buildRuntimeProgram } from "../dev/runtime-program";
import { createLocalRuntimeHarness, type LocalRuntimeHarness } from "../local-runtime-harness";
import { loadProject, type ResolvedProject } from "../project";
import type { Program } from "../runtime";
import {
  createRuntimeDataSnapshotFromFixture,
  type RuntimeDataFixture,
} from "../runtime-data-fixture";

export interface LocalRuntimeTestOptions {
  readonly root?: string;
  readonly runtimeData?: RuntimeDataFixture;
}

interface LocalRuntimeTestEnvironment {
  readonly project: ResolvedProject;
  readonly program: Program;
}

interface LocalRuntimeTestDependencies {
  readonly cwd: string;
  readonly loadProject: typeof loadProject;
  readonly buildRuntimeProgram: typeof buildRuntimeProgram;
}

function createEnvironmentLoader(
  options: LocalRuntimeTestOptions,
  dependencies: LocalRuntimeTestDependencies,
) {
  let environment: Promise<LocalRuntimeTestEnvironment> | undefined;

  return () => {
    environment ??= (async () => {
      const project = await dependencies.loadProject({
        cwd: dependencies.cwd,
        root: options.root,
      });
      const program = await dependencies.buildRuntimeProgram(project, "development");

      return { project, program };
    })();

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
    cwd: process.cwd(),
    loadProject,
    buildRuntimeProgram,
  });
}
