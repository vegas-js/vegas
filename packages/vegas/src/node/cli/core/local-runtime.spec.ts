import { describe, expect, expectTypeOf, test, vi } from "vitest";

import type { ResolvedProject } from "../../project";
import {
  LocalRuntimeSession,
  type ExecutionRequest,
  type Program,
  type PropertiesStore,
  type RuntimeBackend,
  type RuntimeExecutionRequest,
  type SpreadsheetStore,
} from "../../runtime";
import { createLocalRuntime } from "./local-runtime";
import { loadRuntimeDataSnapshot } from "./runtime-data";

const project = {
  root: "/project",
  configFile: null,
  clientDir: "/project/src/client",
  serverDir: "/project/src/server",
  runtimeDataDir: "/project/runtime",
  outputDir: "/project/dist",
  appType: "spa",
  plugins: [],
  devServer: { open: false },
  appsScript: {
    manifest: {
      timeZone: "Asia/Tokyo",
    },
  },
} satisfies ResolvedProject;

describe("createLocalRuntime", () => {
  test("bind the current local Program and invocation context behind the Runtime backend", async () => {
    const runtimeDataSources = ["/project/runtime/session.ts", "/project/runtime/budget.ts"];
    let loadedRoot: string | undefined;
    let loadedSources: readonly string[] | undefined;
    let propertiesStore: PropertiesStore | undefined;

    const loadSnapshot: typeof loadRuntimeDataSnapshot = async (root, sources) => {
      loadedRoot = root;
      loadedSources = sources;

      return {
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
      };
    };
    const execute = vi.fn(async (_request: ExecutionRequest) => "result");
    let program: Program = {
      source: "function main() { return 'first'; }",
      htmlFiles: {},
    };
    const getProgram = vi.fn(() => program);
    const runtimeSession = new LocalRuntimeSession();

    const localRuntime = await createLocalRuntime(
      project,
      runtimeDataSources,
      getProgram,
      {
        session: runtimeSession,
      },
      {
        loadRuntimeDataSnapshot: loadSnapshot,
        createExecutor: (options) => {
          expect(options.cacheStore).toBe(runtimeSession.stores.cacheStore);
          expect(options.driveIteratorStore).toBe(runtimeSession.stores.driveIteratorStore);
          expect(options.driveStore).toBe(runtimeSession.stores.driveStore);
          expect(options.lockStore).toBe(runtimeSession.stores.lockStore);
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

    expect(loadedRoot).toBe("/project");
    expect(loadedSources).toBe(runtimeDataSources);

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
});
