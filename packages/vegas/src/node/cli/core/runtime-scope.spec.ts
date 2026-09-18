import { describe, expect, test } from "vitest";

import type { ResolvedProject } from "../../project";
import { createInvocationScope } from "./runtime-scope";

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
    manifest: {},
  },
} satisfies ResolvedProject;

describe("createInvocationScope", () => {
  test("create local invocation scope", () => {
    expect(createInvocationScope(project)).toStrictEqual({
      scriptKey: "/project",
      userKey: "local-user",
    });
  });
});
