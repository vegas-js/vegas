import { afterEach, describe, expect, test, vi } from "vitest";

import type { AccessTokenProvider, JsonValue, ReferenceConfig } from "../core/types";
import { createReferenceClient } from "./client";

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

  test("preserves Apps Script execution error details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            done: true,
            error: {
              code: 3,
              message: "ScriptError",
              details: [
                {
                  errorMessage: "boom",
                  errorType: "TypeError",
                  scriptStackTraceElements: [
                    {
                      function: "captureReferenceFailure",
                      lineNumber: 42,
                    },
                  ],
                },
              ],
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

    await expect(client.execute("captureReferenceFailure")).rejects.toMatchObject({
      name: "ReferenceExecutionError",
      message: "boom",
      observation: {
        statusCode: 3,
        statusMessage: "ScriptError",
        errorMessage: "boom",
        errorType: "TypeError",
        scriptStackTraceFunctions: ["captureReferenceFailure"],
      },
    });
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
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe("https://script.googleapis.com/v1/scripts/deployment-id:run");

    expect(init).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer access-token",
        "Content-Type": "application/json",
      },
    });

    expect(JSON.parse(init.body as string)).toEqual({
      function: "captureReferenceSmoke",
      devMode: true,
    });
  });
});

test("passes parameters to Apps Script execution", async () => {
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

  const parameters: JsonValue[] = [
    "value",
    42,
    true,
    null,
    {
      nested: {
        value: 1,
      },
    },
    [1, 2, 3],
  ];

  await client.execute("captureReferenceArguments", parameters);

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock).toHaveBeenCalledOnce();

  const [url, init] = fetchMock.mock.calls[0];

  expect(url).toBe("https://script.googleapis.com/v1/scripts/deployment-id:run");

  expect(init).toMatchObject({
    method: "POST",
    headers: {
      Authorization: "Bearer access-token",
      "Content-Type": "application/json",
    },
  });

  expect(JSON.parse(init.body as string)).toEqual({
    function: "captureReferenceArguments",
    parameters,
    devMode: true,
  });
});
