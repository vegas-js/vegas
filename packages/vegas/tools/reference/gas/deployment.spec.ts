import { afterEach, expect, test, vi } from "vitest";

import type { AccessTokenProvider, ReferenceConfig } from "../core/types";
import { getReferenceDeploymentSummary } from "./deployment";

const config: ReferenceConfig = {
  scriptId: "script-id",
  deploymentId: "deployment-id",
};

const accessTokenProvider: AccessTokenProvider = {
  getAccessToken: async () => "access-token",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test("reads the existing reference deployment entry points", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        deploymentId: "deployment-id",
        deploymentConfig: {
          scriptId: "script-id",
          versionNumber: 7,
          manifestFileName: "appsscript",
          description: "reference deployment",
        },
        entryPoints: [
          {
            entryPointType: "EXECUTION_API",
            executionApi: {
              entryPointConfig: {
                access: "ANYONE",
              },
            },
          },
          {
            entryPointType: "WEB_APP",
            webApp: {
              url: "https://script.google.com/macros/s/deployment-id/exec",
              entryPointConfig: {
                access: "ANYONE_ANONYMOUS",
                executeAs: "USER_DEPLOYING",
              },
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  vi.stubGlobal("fetch", fetchMock);

  await expect(getReferenceDeploymentSummary(config, accessTokenProvider)).resolves.toEqual({
    deploymentId: "deployment-id",
    versionNumber: 7,
    manifestFileName: "appsscript",
    description: "reference deployment",
    entryPoints: [
      {
        kind: "execution-api",
        access: "ANYONE",
      },
      {
        kind: "web-app",
        access: "ANYONE_ANONYMOUS",
        executeAs: "USER_DEPLOYING",
        url: "https://script.google.com/macros/s/deployment-id/exec",
      },
    ],
  });

  expect(fetchMock).toHaveBeenCalledOnce();

  const [requestUrl, init] = fetchMock.mock.calls[0]!;

  expect(requestUrl).toBe(
    "https://script.googleapis.com/v1/projects/script-id/deployments/deployment-id",
  );

  expect(init).toMatchObject({
    method: "GET",
  });

  const headers = new Headers(init.headers);

  expect(headers.get("Authorization")).toBe("Bearer access-token");
});

test("rejects an unsuccessful reference deployment request", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("insufficient permissions", {
        status: 403,
        statusText: "Forbidden",
      }),
    ),
  );

  await expect(getReferenceDeploymentSummary(config, accessTokenProvider)).rejects.toThrow(
    "Apps Script deployment request failed: 403 Forbidden: insufficient permissions",
  );
});

test("rejects an unexpected deployment id", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          deploymentId: "different-deployment-id",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    ),
  );

  await expect(getReferenceDeploymentSummary(config, accessTokenProvider)).rejects.toThrow(
    "Apps Script deployment response contained unexpected deploymentId: different-deployment-id",
  );
});
