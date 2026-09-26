import { describe, expect, expectTypeOf, test, vi } from "vitest";

import type { RuntimeDataSnapshot } from "../shared/gas";
import { createLocalRuntime } from "./local-runtime-factory";
import type { LocalRuntimeProject } from "./local-runtime-project";
import {
  InMemoryPropertiesStore,
  InMemorySpreadsheetStore,
  LocalRuntimeSession,
  type ExecutionRequest,
  type Program,
  type PropertiesStore,
  type RuntimeBackend,
  type RuntimeExecutionRequest,
  type SpreadsheetStore,
} from "./runtime";

const project = {
  root: "/project",
  appsScript: {
    manifest: {
      timeZone: "Asia/Tokyo",
    },
  },
} satisfies LocalRuntimeProject;

describe("createLocalRuntime", () => {
  test("bind the current local Program and invocation context behind the Runtime backend", async () => {
    let propertiesStore: PropertiesStore | undefined;
    const snapshot = {
      properties: {
        source: "/project/runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "test",
          },
        },
      },
      session: {
        source: "/project/runtime/session.ts",
        value: {
          activeUserEmail: "active@example.com",
          activeUserLocale: "ja",
          effectiveUserEmail: "effective@example.com",
          temporaryActiveUserKey: "temporary-user-key",
        },
      },
      spreadsheets: [
        {
          source: "/project/runtime/budget.ts",
          value: {
            id: "budget",
            name: "Budget",
            sheets: [],
          },
        },
      ],
    } satisfies RuntimeDataSnapshot;
    const execute = vi.fn(async (_request: ExecutionRequest) => "result");
    let program: Program = {
      source: "function main() { return 'first'; }",
      htmlFiles: {},
    };
    const getProgram = vi.fn(() => program);

    const localRuntime = await createLocalRuntime(
      project,
      snapshot,
      getProgram,
      {},
      {
        createExecutor: (options) => {
          propertiesStore = options.propertiesStore;

          return { execute };
        },
      },
    );

    expectTypeOf(localRuntime).toExtend<RuntimeBackend>();
    expectTypeOf(localRuntime.resources.spreadsheets).toEqualTypeOf<SpreadsheetStore>();
    await expect(
      localRuntime.resources.spreadsheets.getSpreadsheet("budget"),
    ).resolves.toMatchObject({
      id: "budget",
    });

    if (propertiesStore === undefined) {
      throw new Error("expected Properties store");
    }

    await expect(
      propertiesStore.getAll({
        kind: "script",
        scriptKey: "/project",
      }),
    ).resolves.toStrictEqual({
      environment: "test",
    });

    const controller = new AbortController();
    const request: RuntimeExecutionRequest = {
      functionName: "main",
      args: ["value"],
      signal: controller.signal,
    };

    await expect(localRuntime.execute(request)).resolves.toBe("result");
    expect(execute).toHaveBeenLastCalledWith({
      ...request,
      program,
      environment: {
        activeUserEmail: "active@example.com",
        activeUserLocale: "ja",
        effectiveUserEmail: "effective@example.com",
        scriptTimeZone: "Asia/Tokyo",
        temporaryActiveUserKey: "temporary-user-key",
      },
      scope: {
        scriptKey: "/project",
        userKey: "local-user",
      },
    });

    program = {
      source: "function main() { return 'second'; }",
      htmlFiles: {},
    };

    await localRuntime.execute(request);

    expect(getProgram).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenLastCalledWith({
      ...request,
      program,
      environment: {
        activeUserEmail: "active@example.com",
        activeUserLocale: "ja",
        effectiveUserEmail: "effective@example.com",
        scriptTimeZone: "Asia/Tokyo",
        temporaryActiveUserKey: "temporary-user-key",
      },
      scope: {
        scriptKey: "/project",
        userKey: "local-user",
      },
    });
  });

  test("bind every provided local Session store to the Runtime Executor", async () => {
    const snapshot = {
      spreadsheets: [],
    } satisfies RuntimeDataSnapshot;
    const runtimeSession = new LocalRuntimeSession();

    await createLocalRuntime(
      project,
      snapshot,
      () => ({
        source: "",
        htmlFiles: {},
      }),
      {
        session: runtimeSession,
      },
      {
        createExecutor: (options) => {
          expect(options.cacheStore).toBe(runtimeSession.stores.cacheStore);
          expect(options.driveIteratorStore).toBe(runtimeSession.stores.driveIteratorStore);
          expect(options.driveStore).toBe(runtimeSession.stores.driveStore);
          expect(options.lockStore).toBe(runtimeSession.stores.lockStore);
          expect(options.propertiesStore).toBe(runtimeSession.stores.propertiesStore);
          expect(options.spreadsheetStore).toBe(runtimeSession.stores.spreadsheetStore);

          return {
            execute: vi.fn(async (_request: ExecutionRequest) => undefined),
          };
        },
      },
    );
  });

  test("preserve Executor failures through the Runtime backend", async () => {
    const snapshot = {
      spreadsheets: [],
    } satisfies RuntimeDataSnapshot;
    const error = new TypeError("user failure");
    const execute = vi.fn(async (_request: ExecutionRequest) => {
      throw error;
    });
    const localRuntime = await createLocalRuntime(
      project,
      snapshot,
      () => ({
        source: "",
        htmlFiles: {},
      }),
      {},
      {
        createExecutor: () => ({ execute }),
      },
    );

    await expect(
      localRuntime.execute({
        functionName: "main",
        args: ["value"],
      }),
    ).rejects.toBe(error);
  });

  test("use a provided local Properties store without reapplying snapshot seed data", async () => {
    const snapshot = {
      properties: {
        source: "/project/runtime/properties.ts",
        value: {
          scriptProperties: {
            environment: "snapshot",
          },
        },
      },
      spreadsheets: [],
    } satisfies RuntimeDataSnapshot;
    const propertiesStore = new InMemoryPropertiesStore();

    await propertiesStore.set(
      {
        kind: "script",
        scriptKey: "/project",
      },
      "environment",
      "reconciled",
    );
    const runtimeSession = new LocalRuntimeSession({
      stores: {
        propertiesStore,
      },
    });

    await createLocalRuntime(
      project,
      snapshot,
      () => ({
        source: "",
        htmlFiles: {},
      }),
      {
        session: runtimeSession,
      },
      {
        createExecutor: (options) => {
          expect(options.propertiesStore).toBe(propertiesStore);

          return {
            execute: vi.fn(async (_request: ExecutionRequest) => undefined),
          };
        },
      },
    );

    await expect(
      propertiesStore.getAll({
        kind: "script",
        scriptKey: "/project",
      }),
    ).resolves.toStrictEqual({
      environment: "reconciled",
    });
  });

  test("use a provided local Spreadsheet store as the Runtime resource", async () => {
    const snapshot = {
      spreadsheets: [
        {
          source: "/project/runtime/budget.ts",
          value: {
            id: "budget",
            name: "Budget",
            sheets: [],
          },
        },
      ],
    } satisfies RuntimeDataSnapshot;
    const spreadsheetStore = new InMemorySpreadsheetStore([
      {
        id: "reconciled",
        name: "Reconciled",
        sheets: [],
      },
    ]);
    const runtimeSession = new LocalRuntimeSession({
      stores: {
        spreadsheetStore,
      },
    });
    const execute = vi.fn(async (_request: ExecutionRequest) => undefined);

    const localRuntime = await createLocalRuntime(
      project,
      snapshot,
      () => ({
        source: "",
        htmlFiles: {},
      }),
      {
        session: runtimeSession,
      },
      {
        createExecutor: (options) => {
          expect(options.spreadsheetStore).toBe(spreadsheetStore);

          return { execute };
        },
      },
    );

    expect(localRuntime.resources.spreadsheets).toBe(spreadsheetStore);
    await expect(
      localRuntime.resources.spreadsheets.getSpreadsheet("reconciled"),
    ).resolves.toMatchObject({
      id: "reconciled",
    });
    await expect(localRuntime.resources.spreadsheets.getSpreadsheet("budget")).rejects.toThrow(
      "Unknown local Spreadsheet: budget",
    );
  });
});
