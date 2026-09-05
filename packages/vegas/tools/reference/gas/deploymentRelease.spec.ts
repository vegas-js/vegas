import { afterEach, expect, test, vi } from "vitest";

import type { AccessTokenProvider, ReferenceConfig } from "../core/types";
import { ensureReferenceDeployment } from "./deploymentRelease";

const config: ReferenceConfig = {
  scriptId: "script-id",
  deploymentId: "deployment-id",
};

const accessTokenProvider: AccessTokenProvider = {
  getAccessToken: async () => "access-token",
};

function createDeploymentResponse(options: {
  versionNumber: number;
  description: string | null;
  includeWebApp: boolean;
  executionApiAccess?: string;
}) {
  return {
    deploymentId: "deployment-id",
    deploymentConfig: {
      scriptId: "script-id",
      versionNumber: options.versionNumber,
      manifestFileName: "appsscript",
      ...(options.description === null
        ? {}
        : {
            description: options.description,
          }),
    },
    entryPoints: [
      {
        entryPointType: "EXECUTION_API",
        executionApi: {
          entryPointConfig: {
            access: options.executionApiAccess ?? "MYSELF",
          },
        },
      },
      ...(options.includeWebApp
        ? [
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
          ]
        : []),
    ],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("updates the existing reference deployment for a new case revision", async () => {
  const description = "vegas-reference:new-revision";

  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          createDeploymentResponse({
            versionNumber: 1,
            description: null,
            includeWebApp: false,
          }),
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          versionNumber: 2,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          createDeploymentResponse({
            versionNumber: 2,
            description,
            includeWebApp: true,
          }),
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          createDeploymentResponse({
            versionNumber: 2,
            description,
            includeWebApp: true,
          }),
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

  vi.stubGlobal("fetch", fetchMock);

  await expect(
    ensureReferenceDeployment(config, accessTokenProvider, "new-revision"),
  ).resolves.toBe("https://script.google.com/macros/s/deployment-id/exec");

  expect(fetchMock).toHaveBeenCalledTimes(4);

  expect(fetchMock.mock.calls[1]![0]).toBe(
    "https://script.googleapis.com/v1/projects/script-id/versions",
  );

  expect(JSON.parse(fetchMock.mock.calls[1]![1].body as string)).toEqual({
    description,
  });

  expect(fetchMock.mock.calls[2]![0]).toBe(
    "https://script.googleapis.com/v1/projects/script-id/deployments/deployment-id",
  );

  expect(fetchMock.mock.calls[2]![1]).toMatchObject({
    method: "PUT",
  });

  expect(JSON.parse(fetchMock.mock.calls[2]![1].body as string)).toEqual({
    deploymentConfig: {
      scriptId: "script-id",
      versionNumber: 2,
      manifestFileName: "appsscript",
      description,
    },
  });
});

test("reuses the existing reference deployment for the same case revision", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify(
        createDeploymentResponse({
          versionNumber: 2,
          description: "vegas-reference:revision",
          includeWebApp: true,
        }),
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  );

  vi.stubGlobal("fetch", fetchMock);

  await expect(ensureReferenceDeployment(config, accessTokenProvider, "revision")).resolves.toBe(
    "https://script.google.com/macros/s/deployment-id/exec",
  );

  expect(fetchMock).toHaveBeenCalledOnce();
});

test("refuses to change the existing execution API access", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(
          createDeploymentResponse({
            versionNumber: 1,
            description: null,
            includeWebApp: false,
            executionApiAccess: "ANYONE",
          }),
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    ),
  );

  await expect(ensureReferenceDeployment(config, accessTokenProvider, "revision")).rejects.toThrow(
    "Reference deployment must contain exactly one EXECUTION_API entry point with MYSELF access",
  );
});
