import { describe, expect, test } from "vitest";

import type { LocalRuntimeProject } from "./local-runtime-project";
import { createInvocationScope } from "./runtime-scope";

const project = {
  root: "/project",
  appsScript: {
    manifest: {},
  },
} satisfies LocalRuntimeProject;

describe("createInvocationScope", () => {
  test("create local invocation scope", () => {
    expect(createInvocationScope(project)).toStrictEqual({
      scriptKey: "/project",
      userKey: "local-user",
    });
  });
});
