import { afterEach, describe, expect, expectTypeOf, test, vi } from "vitest";

import { RuntimeInfrastructureError, type RuntimeBackend } from "../runtime";
import {
  createGoogleAppsScriptRuntime,
  DEFAULT_GOOGLE_APPS_SCRIPT_REQUEST_TIMEOUT_MS,
  GOOGLE_APPS_SCRIPT_ACCESS_TOKEN_MINIMUM_VALIDITY_MS,
} from "./backend";

interface RecordedFetchRequest {
  readonly input: Parameters<typeof globalThis.fetch>[0];
  readonly init: Parameters<typeof globalThis.fetch>[1];
}

function createRecordingFetch(response: Response) {
  const requests: RecordedFetchRequest[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    requests.push({ input, init });
    return response;
  };

  return { fetch, requests };
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createGoogleAppsScriptRuntime", () => {
  test("execute a deployed API function through the Apps Script API", async () => {
    const { fetch, requests } = createRecordingFetch(
      jsonResponse({
        done: true,
        response: {
          "@type": "type.googleapis.com/google.apps.script.v1.ExecutionResponse",
          result: {
            value: 42,
          },
        },
      }),
    );
    const tokenRequests: { minimumValidityMs: number; signal?: AbortSignal }[] = [];
    const runtime = createGoogleAppsScriptRuntime({
      scriptId: "deployment/id",
      devMode: true,
      acquireAccessToken: async (minimumValidityMs, signal) => {
        tokenRequests.push({ minimumValidityMs, signal });
        return "access-token";
      },
      fetch,
    });

    await expect(
      runtime.execute({
        functionName: "main",
        args: ["value", { count: 2 }],
      }),
    ).resolves.toStrictEqual({
      value: 42,
    });

    expectTypeOf(runtime).toEqualTypeOf<RuntimeBackend>();
    expect(DEFAULT_GOOGLE_APPS_SCRIPT_REQUEST_TIMEOUT_MS).toBe(380_000);
    expect(GOOGLE_APPS_SCRIPT_ACCESS_TOKEN_MINIMUM_VALIDITY_MS).toBe(360_000);
    expect(tokenRequests).toStrictEqual([
      {
        minimumValidityMs: 360_000,
        signal: undefined,
      },
    ]);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.input).toBe("https://script.googleapis.com/v1/scripts/deployment%2Fid:run");
    expect(requests[0]?.init?.method).toBe("POST");
    expect(new Headers(requests[0]?.init?.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
    expect(new Headers(requests[0]?.init?.headers).get("Content-Type")).toBe("application/json");
    expect(requests[0]?.init?.body).toBe(
      JSON.stringify({
        function: "main",
        parameters: ["value", { count: 2 }],
        devMode: true,
      }),
    );
  });

  test("omit optional request fields and return undefined when the function has no result", async () => {
    const { fetch, requests } = createRecordingFetch(
      jsonResponse({
        done: true,
        response: {
          "@type": "type.googleapis.com/google.apps.script.v1.ExecutionResponse",
        },
      }),
    );
    const runtime = createGoogleAppsScriptRuntime({
      scriptId: "deployment-id",
      acquireAccessToken: async () => "access-token",
      fetch,
    });

    await expect(
      runtime.execute({
        functionName: "main",
        args: [],
      }),
    ).resolves.toBeUndefined();
    expect(requests[0]?.init?.body).toBe(
      JSON.stringify({
        function: "main",
      }),
    );
  });

  test("restore remote script exceptions outside the infrastructure error model", async () => {
    const { fetch } = createRecordingFetch(
      jsonResponse({
        done: true,
        error: {
          code: 3,
          message: "INVALID_ARGUMENT",
          details: [
            {
              "@type": "type.googleapis.com/google.apps.script.v1.ExecutionError",
              errorMessage: "Bad input",
              errorType: "TypeError",
              scriptStackTraceElements: [
                {
                  function: "main",
                  lineNumber: 12,
                },
                {
                  function: "validate",
                  lineNumber: 4,
                },
              ],
            },
          ],
        },
      }),
    );
    const runtime = createGoogleAppsScriptRuntime({
      scriptId: "deployment-id",
      acquireAccessToken: async () => "access-token",
      fetch,
    });
    const result = runtime.execute({
      functionName: "main",
      args: [],
    });

    await expect(result).rejects.toBeInstanceOf(TypeError);
    await expect(result).rejects.not.toBeInstanceOf(RuntimeInfrastructureError);
    await expect(result).rejects.toMatchObject({
      name: "TypeError",
      message: "Bad input",
      stack: "TypeError: Bad input\n    at main (line 12)\n    at validate (line 4)",
    });
  });

  test("map a remote SCRIPT_TIMEOUT status to an infrastructure timeout", async () => {
    const { fetch } = createRecordingFetch(
      jsonResponse({
        done: true,
        error: {
          code: 10,
          message: "Script timed out",
          details: [],
        },
      }),
    );
    const runtime = createGoogleAppsScriptRuntime({
      scriptId: "deployment-id",
      acquireAccessToken: async () => "access-token",
      fetch,
    });
    const result = runtime.execute({
      functionName: "main",
      args: [],
    });

    await expect(result).rejects.toBeInstanceOf(RuntimeInfrastructureError);
    await expect(result).rejects.toMatchObject({
      kind: "timeout",
      message: "Script timed out",
    });
  });

  test.each([401, 403])("classify HTTP %i as an authentication failure", async (status) => {
    const { fetch } = createRecordingFetch(new Response(null, { status }));
    const runtime = createGoogleAppsScriptRuntime({
      scriptId: "deployment-id",
      acquireAccessToken: async () => "access-token",
      fetch,
    });

    await expect(
      runtime.execute({
        functionName: "main",
        args: [],
      }),
    ).rejects.toMatchObject({
      kind: "authentication",
      message: `Google Apps Script execution request failed with HTTP ${status}.`,
    });
  });

  test("classify non-authentication HTTP failures as backend failures", async () => {
    const { fetch } = createRecordingFetch(new Response(null, { status: 500 }));
    const runtime = createGoogleAppsScriptRuntime({
      scriptId: "deployment-id",
      acquireAccessToken: async () => "access-token",
      fetch,
    });

    await expect(
      runtime.execute({
        functionName: "main",
        args: [],
      }),
    ).rejects.toMatchObject({
      kind: "backend",
      message: "Google Apps Script execution request failed with HTTP 500.",
    });
  });

  test("reject malformed and incomplete API operations", async () => {
    const malformedRuntime = createGoogleAppsScriptRuntime({
      scriptId: "deployment-id",
      acquireAccessToken: async () => "access-token",
      fetch: createRecordingFetch(new Response("not-json", { status: 200 })).fetch,
    });
    const incompleteRuntime = createGoogleAppsScriptRuntime({
      scriptId: "deployment-id",
      acquireAccessToken: async () => "access-token",
      fetch: createRecordingFetch(jsonResponse({ done: false })).fetch,
    });

    await expect(
      malformedRuntime.execute({
        functionName: "main",
        args: [],
      }),
    ).rejects.toMatchObject({
      kind: "protocol",
      message: "Google Apps Script API returned an invalid JSON response.",
    });
    await expect(
      incompleteRuntime.execute({
        functionName: "main",
        args: [],
      }),
    ).rejects.toMatchObject({
      kind: "protocol",
      message: "Google Apps Script API returned an incomplete execution operation.",
    });
  });

  test("fail closed on parameters the Execution API cannot represent", async () => {
    let tokenCalls = 0;
    let fetchCalls = 0;
    const fetch: typeof globalThis.fetch = async () => {
      fetchCalls += 1;
      return jsonResponse({ done: true, response: {} });
    };
    const runtime = createGoogleAppsScriptRuntime({
      scriptId: "deployment-id",
      acquireAccessToken: async () => {
        tokenCalls += 1;
        return "access-token";
      },
      fetch,
    });
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const sparse = Array.from<unknown>({ length: 2 });
    sparse[0] = "value";

    for (const value of [
      undefined,
      Number.NaN,
      new Date("2026-09-27T00:00:00.000Z"),
      circular,
      sparse,
    ]) {
      await expect(
        runtime.execute({
          functionName: "main",
          args: [value],
        }),
      ).rejects.toMatchObject({
        kind: "serialization",
      });
    }

    expect(tokenCalls).toBe(0);
    expect(fetchCalls).toBe(0);
  });

  test("reject Vegas web-app invocation context before remote execution", async () => {
    let tokenCalls = 0;
    const runtime = createGoogleAppsScriptRuntime({
      scriptId: "deployment-id",
      acquireAccessToken: async () => {
        tokenCalls += 1;
        return "access-token";
      },
      fetch: async () => {
        throw new Error("unexpected fetch");
      },
    });

    await expect(
      runtime.execute({
        functionName: "doGet",
        args: [],
        context: {
          webApp: true,
          userAgent: "test",
        },
      }),
    ).rejects.toMatchObject({
      kind: "backend",
      message:
        "Google Apps Script API execution does not support Vegas web-app invocation context.",
    });
    expect(tokenCalls).toBe(0);
  });

  test("wrap access token acquisition failures as authentication infrastructure errors", async () => {
    const tokenError = new Error("refresh failed");
    const runtime = createGoogleAppsScriptRuntime({
      scriptId: "deployment-id",
      acquireAccessToken: async () => {
        throw tokenError;
      },
      fetch: async () => {
        throw new Error("unexpected fetch");
      },
    });
    const result = runtime.execute({
      functionName: "main",
      args: [],
    });

    await expect(result).rejects.toBeInstanceOf(RuntimeInfrastructureError);
    await expect(result).rejects.toMatchObject({
      kind: "authentication",
      message: "Google Apps Script access token acquisition failed.",
      cause: tokenError,
    });
  });

  test("propagate caller cancellation instead of reclassifying it", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled");
    let tokenCalls = 0;

    controller.abort(reason);

    const runtime = createGoogleAppsScriptRuntime({
      scriptId: "deployment-id",
      acquireAccessToken: async () => {
        tokenCalls += 1;
        return "access-token";
      },
      fetch: async () => {
        throw new Error("unexpected fetch");
      },
    });

    await expect(
      runtime.execute({
        functionName: "main",
        args: [],
        signal: controller.signal,
      }),
    ).rejects.toBe(reason);
    expect(tokenCalls).toBe(0);
  });

  test("abort an HTTP request that exceeds the backend request deadline", async () => {
    vi.useFakeTimers();

    const fetch: typeof globalThis.fetch = (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;

        if (signal === undefined || signal === null) {
          reject(new Error("missing abort signal"));
          return;
        }

        const abort = () => {
          reject(signal.reason);
        };

        if (signal.aborted) {
          abort();
        } else {
          signal.addEventListener("abort", abort, { once: true });
        }
      });
    const runtime = createGoogleAppsScriptRuntime({
      scriptId: "deployment-id",
      acquireAccessToken: async () => "access-token",
      requestTimeoutMs: 1_000,
      fetch,
    });
    const result = runtime.execute({
      functionName: "main",
      args: [],
    });
    const rejection = expect(result).rejects.toMatchObject({
      kind: "timeout",
      message: "Google Apps Script request timed out after 1000 ms.",
    });

    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
    await expect(result).rejects.toBeInstanceOf(RuntimeInfrastructureError);
  });

  test("validate backend construction options", () => {
    expect(() =>
      createGoogleAppsScriptRuntime({
        scriptId: "",
        acquireAccessToken: async () => "access-token",
      }),
    ).toThrow("Google Apps Script script id must not be empty.");

    expect(() =>
      createGoogleAppsScriptRuntime({
        scriptId: "deployment-id",
        acquireAccessToken: async () => "access-token",
        requestTimeoutMs: 0,
      }),
    ).toThrow("Google Apps Script request timeout must be a positive integer.");
  });
});
