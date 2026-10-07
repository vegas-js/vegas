import { describe, expect, test } from "vitest";

import type { LocalRuntimeProject } from "./project";
import { createInvocationScope } from "./scope";

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
