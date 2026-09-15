import { describe, expect, test, vi } from "vitest";

import { createAppsScriptApiPushTransport } from "./api-transport";
import type { AppsScriptPushRequest } from "./request";

const request: AppsScriptPushRequest = {
  scriptId: "script-id",
  content: {
    files: [
      {
        name: "Code",
        type: "SERVER_JS",
        source: "function hello() {}",
      },
      {
        name: "appsscript",
        type: "JSON",
        source: "{}",
      },
    ],
  },
};

describe("createAppsScriptApiPushTransport", () => {
  test("push project content with bearer token", async () => {
    const accessTokenProvider = {
      getAccessToken: vi.fn(async () => "access-token"),
    };

    const fetch = vi.fn<typeof globalThis.fetch>();
    fetch.mockResolvedValue(
      new Response("{}", {
        status: 200,
      }),
    );

    const transport = createAppsScriptApiPushTransport({
      accessTokenProvider,
      fetch,
    });

    await transport.push(request);

    expect(accessTokenProvider.getAccessToken).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(
      "https://script.googleapis.com/v1/projects/script-id/content",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.content),
      },
    );
  });

  test("reject empty access token before network request", async () => {
    const accessTokenProvider = {
      getAccessToken: vi.fn(async () => ""),
    };

    const fetch = vi.fn<typeof globalThis.fetch>();

    const transport = createAppsScriptApiPushTransport({
      accessTokenProvider,
      fetch,
    });

    await expect(transport.push(request)).rejects.toThrow("Apps Script access token is required.");
    expect(fetch).not.toHaveBeenCalled();
  });

  test("reject failed API response with response body", async () => {
    const accessTokenProvider = {
      getAccessToken: vi.fn(async () => "access-token"),
    };

    const fetch = vi.fn<typeof globalThis.fetch>();
    fetch.mockResolvedValue(
      new Response('{"error":{"message":"Permission denied"}}', {
        status: 403,
        statusText: "Forbidden",
      }),
    );

    const transport = createAppsScriptApiPushTransport({
      accessTokenProvider,
      fetch,
    });

    await expect(transport.push(request)).rejects.toThrow(
      [
        "Apps Script updateContent failed: 403 Forbidden",
        '{"error":{"message":"Permission denied"}}',
      ].join("\n"),
    );
  });

  test("reject failed API response without response body", async () => {
    const accessTokenProvider = {
      getAccessToken: vi.fn(async () => "access-token"),
    };

    const fetch = vi.fn<typeof globalThis.fetch>();
    fetch.mockResolvedValue(
      new Response(null, {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    const transport = createAppsScriptApiPushTransport({
      accessTokenProvider,
      fetch,
    });

    await expect(transport.push(request)).rejects.toThrow(
      "Apps Script updateContent failed: 500 Internal Server Error",
    );
  });
});
