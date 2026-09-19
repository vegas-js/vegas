import { describe, expect, expectTypeOf, test } from "vitest";

import type { ResolvedProject } from "../../project";
import type { Executor, InvocationEnvironment, InvocationScope } from "../../runtime";
import { createLocalRuntime, type LocalRuntime } from "./local-runtime";
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
  appsScript: {
    manifest: {
      timeZone: "Asia/Tokyo",
    },
  },
} satisfies ResolvedProject;

describe("createLocalRuntime", () => {
  test("compose local Runtime dependencies from project and runtime data", async () => {
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

    const runtime = await createLocalRuntime(project, runtimeDataSources, load);

    expectTypeOf(runtime).toEqualTypeOf<LocalRuntime>();
    expectTypeOf(runtime.executor).toEqualTypeOf<Executor>();
    expectTypeOf(runtime.environment).toEqualTypeOf<InvocationEnvironment>();
    expectTypeOf(runtime.scope).toEqualTypeOf<InvocationScope>();

    expect(loadedRoot).toBe("/project");
    expect(loadedSources).toBe(runtimeDataSources);
    expect(loadedScope).toStrictEqual({
      scriptKey: "/project",
      userKey: "local-user",
    });
    expect(runtime.environment).toStrictEqual({
      activeUserEmail: "active@example.com",
      activeUserLocale: "ja",
      effectiveUserEmail: "effective@example.com",
      scriptTimeZone: "Asia/Tokyo",
      temporaryActiveUserKey: "temporary-user-key",
    });
    expect(runtime.scope).toStrictEqual({
      scriptKey: "/project",
      userKey: "local-user",
    });
    expect(runtime.executor.execute).toBeTypeOf("function");
  });
});
