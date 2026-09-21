import { describe, expect, test } from "vitest";

import type { LocalRuntimeProject } from "./local-runtime-project";
import { createInvocationEnvironment } from "./runtime-environment";

const project = {
  root: "/project",
  appsScript: {
    manifest: {
      timeZone: "Asia/Tokyo",
    },
  },
} satisfies LocalRuntimeProject;

// https://developers.google.com/apps-script/reference/base/session
describe("createInvocationEnvironment", () => {
  test("preserve invocation environment values", () => {
    expect(
      createInvocationEnvironment(project, {
        activeUserEmail: "active@example.com",
        activeUserLocale: "ja",
        effectiveUserEmail: "effective@example.com",
        temporaryActiveUserKey: "temporary-user-key",
      }),
    ).toStrictEqual({
      activeUserEmail: "active@example.com",
      activeUserLocale: "ja",
      effectiveUserEmail: "effective@example.com",
      scriptTimeZone: "Asia/Tokyo",
      temporaryActiveUserKey: "temporary-user-key",
    });
  });

  test("provide local defaults without Session runtime data", () => {
    expect(createInvocationEnvironment(project)).toStrictEqual({
      activeUserEmail: "",
      activeUserLocale: "en",
      effectiveUserEmail: "",
      scriptTimeZone: "Asia/Tokyo",
      temporaryActiveUserKey: "",
    });
  });
});
