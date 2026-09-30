import { describe, expect, expectTypeOf, test, vi } from "vitest";

import { createAppsScriptUserAccessTokenProvider } from "../auth";
import type { RuntimeBackend } from "../runtime";
import { createGoogleAppsScriptRuntime } from "../runtime/node";
import { createGoogleAppsScriptUserRuntime } from "./factory";

const env: NodeJS.ProcessEnv = {
  HOME: "/home/test",
};

describe("createGoogleAppsScriptUserRuntime", () => {
  test("compose user credentials with the Google Apps Script Runtime backend", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const now = vi.fn(() => 1_000_000);
    const getAccessToken = vi.fn(async () => "access-token");
    const execute = vi.fn(async () => "result");
    const backend: RuntimeBackend = { execute };
    let accessTokenProviderOptions:
      | NonNullable<Parameters<typeof createAppsScriptUserAccessTokenProvider>[0]>
      | undefined;
    let runtimeOptions: Parameters<typeof createGoogleAppsScriptRuntime>[0] | undefined;

    const runtime = createGoogleAppsScriptUserRuntime(
      {
        scriptId: "script-id",
        profile: "work",
        requiredScopes: [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive",
        ],
        devMode: true,
        requestTimeoutMs: 380_000,
        accessTokenRequestTimeoutMs: 15_000,
        platform: "linux",
        homeDir: "/home/test",
        env,
        fetch,
        now,
      },
      {
        createAccessTokenProvider: (options) => {
          accessTokenProviderOptions = options;
          return { getAccessToken };
        },
        createRuntime: (options) => {
          runtimeOptions = options;
          return backend;
        },
      },
    );

    expectTypeOf(runtime).toEqualTypeOf<RuntimeBackend>();
    expect(runtime).toBe(backend);
    expect(accessTokenProviderOptions).toStrictEqual({
      profile: "work",
      requiredScopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
      platform: "linux",
      homeDir: "/home/test",
      env,
      fetch,
      now,
      requestTimeoutMs: 15_000,
    });

    if (runtimeOptions === undefined) {
      throw new Error("expected Google Apps Script Runtime options");
    }

    expect(runtimeOptions).toMatchObject({
      scriptId: "script-id",
      devMode: true,
      requestTimeoutMs: 380_000,
      fetch,
    });

    const controller = new AbortController();
    await expect(runtimeOptions.acquireAccessToken(360_000, controller.signal)).resolves.toBe(
      "access-token",
    );
    expect(getAccessToken).toHaveBeenCalledOnce();
    expect(getAccessToken).toHaveBeenCalledWith({
      minimumValidityMs: 360_000,
      signal: controller.signal,
    });
  });

  test("keep execution and access-token request timeouts independent", () => {
    let accessTokenRequestTimeoutMs: number | undefined;
    let executionRequestTimeoutMs: number | undefined;

    createGoogleAppsScriptUserRuntime(
      {
        scriptId: "script-id",
        requestTimeoutMs: 390_000,
        accessTokenRequestTimeoutMs: 20_000,
      },
      {
        createAccessTokenProvider: (options) => {
          accessTokenRequestTimeoutMs = options.requestTimeoutMs;
          return {
            getAccessToken: vi.fn(async () => "access-token"),
          };
        },
        createRuntime: (options) => {
          executionRequestTimeoutMs = options.requestTimeoutMs;
          return {
            execute: vi.fn(async () => undefined),
          };
        },
      },
    );

    expect(accessTokenRequestTimeoutMs).toBe(20_000);
    expect(executionRequestTimeoutMs).toBe(390_000);
  });
});
