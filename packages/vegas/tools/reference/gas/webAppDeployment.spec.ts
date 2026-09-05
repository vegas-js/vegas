import { afterEach, expect, test, vi } from "vitest";

import type { AccessTokenProvider, ReferenceConfig } from "../core/types";
import { ensureReferenceWebAppDeployment } from "./webAppDeployment";

const config: ReferenceConfig = {
  scriptId: "script-id",
  deploymentId: "execution-api-deployment-id",
};

const tokenProvider: AccessTokenProvider = {
  getAccessToken: async () => "access-token",
};

function createDeployment(
  description: string,
  versionNumber: number,
  deploymentId = "web-app-deployment-id",
) {
  return {
    deploymentId,
    deploymentConfig: {
      scriptId: "script-id",
      versionNumber,
      manifestFileName: "appsscript",
      description,
    },
    entryPoints: [
      {
        entryPointType: "WEB_APP",
        webApp: {
          url: `https://script.google.com/macros/s/${deploymentId}/exec`,
          entryPointConfig: {
            access: "ANYONE_ANONYMOUS",
            executeAs: "USER_DEPLOYING",
          },
        },
      },
    ],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("creates a reference web app deployment for a new revision", async () => {
  const description = "vegas-reference-web-app:revision";

  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          deployments: [],
        }),
        {
          status: 200,
        },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          versionNumber: 7,
        }),
        {
          status: 200,
        },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(createDeployment(description, 7)), {
        status: 200,
      }),
    );

  vi.stubGlobal("fetch", fetchMock);

  await expect(ensureReferenceWebAppDeployment(config, tokenProvider, "revision")).resolves.toBe(
    "https://script.google.com/macros/s/web-app-deployment-id/exec",
  );

  expect(fetchMock).toHaveBeenCalledTimes(3);

  expect(fetchMock.mock.calls[1]![0]).toBe(
    "https://script.googleapis.com/v1/projects/script-id/versions",
  );

  expect(JSON.parse(fetchMock.mock.calls[1]![1].body as string)).toEqual({
    description,
  });

  expect(fetchMock.mock.calls[2]![0]).toBe(
    "https://script.googleapis.com/v1/projects/script-id/deployments",
  );

  expect(JSON.parse(fetchMock.mock.calls[2]![1].body as string)).toEqual({
    versionNumber: 7,
    manifestFileName: "appsscript",
    description,
  });
});

test("reuses a reference web app deployment for the same revision", async () => {
  const description = "vegas-reference-web-app:revision";
  const deployment = createDeployment(description, 7);

  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        deployments: [deployment],
      }),
      {
        status: 200,
      },
    ),
  );

  vi.stubGlobal("fetch", fetchMock);

  await expect(ensureReferenceWebAppDeployment(config, tokenProvider, "revision")).resolves.toBe(
    "https://script.google.com/macros/s/web-app-deployment-id/exec",
  );

  expect(fetchMock).toHaveBeenCalledOnce();
});

test("updates the reference web app deployment for a new revision", async () => {
  const previousDeployment = createDeployment("vegas-reference-web-app:old-revision", 6);

  const updatedDeployment = createDeployment("vegas-reference-web-app:new-revision", 7);

  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          deployments: [previousDeployment],
        }),
        {
          status: 200,
        },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          versionNumber: 7,
        }),
        {
          status: 200,
        },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(updatedDeployment), {
        status: 200,
      }),
    );

  vi.stubGlobal("fetch", fetchMock);

  await expect(
    ensureReferenceWebAppDeployment(config, tokenProvider, "new-revision"),
  ).resolves.toBe("https://script.google.com/macros/s/web-app-deployment-id/exec");

  expect(fetchMock).toHaveBeenCalledTimes(3);

  expect(fetchMock.mock.calls[2]![0]).toBe(
    "https://script.googleapis.com/v1/projects/script-id/deployments/web-app-deployment-id",
  );

  expect(fetchMock.mock.calls[2]![1]).toMatchObject({
    method: "PUT",
  });

  expect(JSON.parse(fetchMock.mock.calls[2]![1].body as string)).toEqual({
    deploymentConfig: {
      scriptId: "script-id",
      versionNumber: 7,
      manifestFileName: "appsscript",
      description: "vegas-reference-web-app:new-revision",
    },
  });
});
