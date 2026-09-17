import { describe, expect, test } from "vitest";

import { ArtifactStore } from "../../build";
import type { ResolvedProject } from "../../project";
import { createServeContext } from "./context";
import { createLegacyInvocationScope } from "./runtime-scope";

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

describe("createLegacyInvocationScope", () => {
  test("create local invocation scope", () => {
    const ctx = createServeContext(project, new ArtifactStore());

    expect(createLegacyInvocationScope(ctx)).toStrictEqual({
      scriptKey: "/project",
      userKey: "local-user",
    });
  });
});
