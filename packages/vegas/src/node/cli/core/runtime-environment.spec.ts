import { describe, expect, test } from "vitest";

import { RuntimeDataTarget } from "../../../shared/gas";
import { ArtifactStore } from "../../build";
import type { ResolvedProject } from "../../project";
import { createServeContext } from "./context";
import { createLegacyInvocationEnvironment } from "./runtime-environment";

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

// https://developers.google.com/apps-script/reference/base/session
describe("createLegacyInvocationEnvironment", () => {
  test("preserve invocation environment values", () => {
    const ctx = createServeContext(project, new ArtifactStore());

    ctx.mock[RuntimeDataTarget.Session] = {
      activeUserEmail: "active@example.com",
      activeUserLocale: "ja",
      effectiveUserEmail: "effective@example.com",
      temporaryActiveUserKey: "temporary-user-key",
    };

    expect(createLegacyInvocationEnvironment(ctx)).toStrictEqual({
      activeUserEmail: "active@example.com",
      activeUserLocale: "ja",
      effectiveUserEmail: "effective@example.com",
      scriptTimeZone: "Asia/Tokyo",
      temporaryActiveUserKey: "temporary-user-key",
    });
  });
});
