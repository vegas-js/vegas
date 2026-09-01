import { afterEach, describe, expect, test, vi } from "vitest";

import { createReferenceClient } from "./client";
import type { AccessTokenProvider, ReferenceConfig } from "./types";

const config: ReferenceConfig = {
  scriptId: "script-id",
  deploymentId: "deployment-id",
};
const tokenProvider: AccessTokenProvider = {
  getAccessToken: async () => "access-token",
};

afterEach(() => vi.unstubAllGlobals());

describe("AppsScriptReferenceClient", () => {
  test("returns Apps Script result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          done: true,
          response: {
            result: {
              value: "result",
            },
          },
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
    const client = createReferenceClient(config, tokenProvider);

    await expect(client.execute("captureReferenceSmoke")).resolves.toEqual({
      value: "result",
    });
  });

  test("preserves falsy Apps Script result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            done: true,
            response: {
              result: false,
            },
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
    const client = createReferenceClient(config, tokenProvider);

    await expect(client.execute("captureReferenceSmoke")).resolves.toBe(false);
  });

  test("rejects when Apps Script API request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Unauthorized", {
          status: 401,
          statusText: "Unauthorized",
        }),
      ),
    );
    const client = createReferenceClient(config, tokenProvider);

    await expect(client.execute("captureReferenceSmoke")).rejects.toThrow(
      "Apps Script API request failed",
    );
  });

  test("rejects when Apps Script execution fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            done: true,
            error: {
              code: 3,
              message: "Something went wrong",
            },
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
    const client = createReferenceClient(config, tokenProvider);

    await expect(client.execute("captureReferenceSmoke")).rejects.toThrow("Something went wrong");
  });

  test("calls scripts.run with deployment id and dev mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          done: true,
          response: {
            result: null,
          },
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
    const client = createReferenceClient(config, tokenProvider);
    await client.execute("captureReferenceSmoke");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://script.googleapis.com/v1/scripts/deployment-id:run",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          function: "captureReferenceSmoke",
          devMode: true,
        }),
      },
    );
  });
});
