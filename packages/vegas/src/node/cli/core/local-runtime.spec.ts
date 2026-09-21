import { describe, expect, expectTypeOf, test, vi } from "vitest";

import type { ResolvedProject } from "../../project";
import type {
  ExecutionRequest,
  InvocationScope,
  Program,
  RuntimeBackend,
  RuntimeExecutionRequest,
  SpreadsheetStore,
} from "../../runtime";
import { createLocalRuntime } from "./local-runtime";
import { loadRuntimeData } from "./runtime-data";

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
    let loadedScope: InvocationScope | undefined;

    const load: typeof loadRuntimeData = async (root, sources, _propertiesStore, scope) => {
      loadedRoot = root;
      loadedSources = sources;
      loadedScope = scope;

      return {
        session: {
          activeUserEmail: "active@example.com",
          activeUserLocale: "ja",
          effectiveUserEmail: "effective@example.com",
          temporaryActiveUserKey: "temporary-user-key",
        },
        spreadsheets: [
          {
            id: "budget",
            name: "Budget",
            sheets: [],
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

    const localRuntime = await createLocalRuntime(
      project,
      runtimeDataSources,
      getProgram,
      {},
      {
        loadRuntimeData: load,
        createExecutor: () => ({ execute }),
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
    expect(loadedScope).toStrictEqual({
      scriptKey: "/project",
      userKey: "local-user",
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
