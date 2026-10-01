import {
  createInvocationScope,
  createLocalRuntime,
  type LocalRuntimeProject,
} from "../local-runtime";
import type {
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  LocalRuntime,
  LocalRuntimeSession,
  Program,
} from "../runtime";
import type { RuntimeDataSnapshot } from "../runtime-data";
import { createSeededLocalRuntimeSession } from "../runtime-data";
import type { SpreadsheetUrlCapability } from "../runtime/spreadsheet/url-capability";

export interface LocalRuntimeHarness {
  readonly appsScript: {
    execute(functionName: string, args?: readonly unknown[]): Promise<unknown>;
  };
  readonly runtime: LocalRuntime;
  readonly session: LocalRuntimeSession;
  readonly propertiesStore: InMemoryPropertiesStore;
  readonly spreadsheetStore: InMemorySpreadsheetStore;
}

export interface LocalRuntimeHarnessOptions {
  readonly project: LocalRuntimeProject;
  readonly snapshot: RuntimeDataSnapshot;
  readonly program: Program;
  readonly spreadsheetUrlCapability?: SpreadsheetUrlCapability;
}

export async function createLocalRuntimeHarness(
  options: LocalRuntimeHarnessOptions,
): Promise<LocalRuntimeHarness> {
  const { session, propertiesStore, spreadsheetStore } = await createSeededLocalRuntimeSession(
    createInvocationScope(options.project),
    options.snapshot,
  );
  const runtime = await createLocalRuntime(
    options.project,
    options.snapshot,
    () => options.program,
    {
      session,
      spreadsheetUrlCapability: options.spreadsheetUrlCapability,
    },
  );

  return {
    appsScript: {
      execute(functionName: string, args: readonly unknown[] = []) {
        return runtime.execute({ functionName, args });
      },
    },
    runtime,
    session,
    propertiesStore,
    spreadsheetStore,
  };
}
