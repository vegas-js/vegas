import { afterEach, expect, test, vi } from "vitest";

import { computeCaseRevision, updateReferenceProject } from "./project";
import type { AccessTokenProvider, ReferenceConfig } from "./types";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("updates Apps Script project content", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(null, {
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const config: ReferenceConfig = {
    scriptId: "script-id",
    deploymentId: "deployment-id",
  };
  const accessTokenProvider: AccessTokenProvider = {
    async getAccessToken() {
      return "access-token";
    },
  };
  const files = [
    {
      name: "appsscript",
      type: "JSON" as const,
      source: "{}",
    },
    {
      name: "smoke",
      type: "SERVER_JS" as const,
      source: "function captureReferenceSmoke() {}",
    },
  ];
  await updateReferenceProject(config, accessTokenProvider, files);

  expect(fetchMock).toHaveBeenCalledOnce();

  const [url, init] = fetchMock.mock.calls[0];

  expect(url).toBe("https://script.googleapis.com/v1/projects/script-id/content");
  expect(init).toMatchObject({
    method: "PUT",
    headers: {
      Authorization: "Bearer access-token",
      "Content-Type": "application/json",
    },
  });
  expect(JSON.parse(init.body as string)).toEqual({
    files,
  });
});

test("rejects when project update fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("Forbidden", {
        status: 403,
        statusText: "Forbidden",
      }),
    ),
  );

  const config: ReferenceConfig = {
    scriptId: "script-id",
    deploymentId: "deployment-id",
  };
  const accessTokenProvider: AccessTokenProvider = {
    async getAccessToken() {
      return "access-token";
    },
  };

  await expect(updateReferenceProject(config, accessTokenProvider, [])).rejects.toThrow(
    "Apps Script project update failed: 403 Forbidden: Forbidden",
  );
});

test("case revision is independent of file order", () => {
  const files = [
    {
      name: "appsscript",
      type: "JSON" as const,
      source: "{}",
    },
    {
      name: "smoke",
      type: "SERVER_JS" as const,
      source: "function smoke() {}",
    },
  ];

  expect(computeCaseRevision(files)).toBe(computeCaseRevision([...files].reverse()));
});

test("case revision changes when source changes", () => {
  const before = computeCaseRevision([
    {
      name: "smoke",
      type: "SERVER_JS" as const,
      source: "return 1;",
    },
  ]);
  const after = computeCaseRevision([
    {
      name: "smoke",
      type: "SERVER_JS" as const,
      source: "return 2;",
    },
  ]);

  expect(after).not.toBe(before);
});
