import { describe, expect, test } from "vitest";

import {
  DEFAULT_GOOGLE_HTTP_REQUEST_TIMEOUT_MS,
  createGoogleHttpRequestSignal,
} from "./google-http-request";

describe("createGoogleHttpRequestSignal", () => {
  test("use a one minute default request lifetime", () => {
    expect(DEFAULT_GOOGLE_HTTP_REQUEST_TIMEOUT_MS).toBe(60_000);
    expect(createGoogleHttpRequestSignal()).toBeInstanceOf(AbortSignal);
  });

  test("compose caller cancellation with the request deadline", () => {
    const controller = new AbortController();
    const signal = createGoogleHttpRequestSignal({
      signal: controller.signal,
      requestTimeoutMs: 60_000,
    });
    const reason = new Error("cancelled");

    controller.abort(reason);

    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(reason);
  });

  test("require a positive integer timeout", () => {
    expect(() => createGoogleHttpRequestSignal({ requestTimeoutMs: 0 })).toThrow(
      "Google HTTP request timeout must be a positive integer.",
    );
    expect(() => createGoogleHttpRequestSignal({ requestTimeoutMs: 1.5 })).toThrow(
      "Google HTTP request timeout must be a positive integer.",
    );
  });
});
