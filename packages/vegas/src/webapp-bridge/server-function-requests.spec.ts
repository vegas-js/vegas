import { afterEach, describe, expect, test, vi } from "vitest";

import { ServerFunctionRequestRegistry } from "./server-function-requests";

afterEach(() => {
  vi.useRealTimers();
});

describe("ServerFunctionRequestRegistry", () => {
  test("complete a pending request once", () => {
    const success = vi.fn();
    const requests = new ServerFunctionRequestRegistry();
    const requestId = requests.create({ success });

    requests.complete({
      requestId,
      status: "ok",
      result: "result",
    });
    requests.complete({
      requestId,
      status: "ok",
      result: "ignored",
    });

    expect(success).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledWith("result");
  });

  test("pass the user object to success handlers", () => {
    const success = vi.fn();
    const userObject = { id: "button" };
    const requests = new ServerFunctionRequestRegistry();
    const requestId = requests.create({ success, userObject });

    requests.complete({
      requestId,
      status: "ok",
      result: "result",
    });

    expect(success).toHaveBeenCalledWith("result", userObject);
  });

  test("pass Error and the user object to failure handlers", () => {
    const failure = vi.fn();
    const userObject = { id: "button" };
    const requests = new ServerFunctionRequestRegistry();
    const requestId = requests.create({ failure, userObject });

    requests.complete({
      requestId,
      status: "err",
      message: "server failure",
    });
    requests.complete({
      requestId,
      status: "err",
      message: "ignored",
    });

    expect(failure).toHaveBeenCalledOnce();
    expect(failure).toHaveBeenCalledWith(expect.any(Error), userObject);
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ message: "server failure" });
  });

  test("report an unhandled failure", () => {
    const reportUnhandledFailure = vi.fn();
    const requests = new ServerFunctionRequestRegistry({ reportUnhandledFailure });
    const requestId = requests.create({});

    requests.complete({
      requestId,
      status: "err",
      message: "server failure",
    });

    expect(reportUnhandledFailure).toHaveBeenCalledWith("server failure");
  });

  test("suppress the default failure report for an explicit null handler", () => {
    const reportUnhandledFailure = vi.fn();
    const requests = new ServerFunctionRequestRegistry({ reportUnhandledFailure });
    const requestId = requests.create({ failure: null });

    requests.complete({
      requestId,
      status: "err",
      message: "server failure",
    });

    expect(reportUnhandledFailure).not.toHaveBeenCalled();
  });

  test("fail every request that was pending when the transport disconnects", () => {
    const firstFailure = vi.fn();
    const secondFailure = vi.fn();
    const requests = new ServerFunctionRequestRegistry();
    const firstRequestId = requests.create({ failure: firstFailure });
    const secondRequestId = requests.create({ failure: secondFailure });

    requests.failAll("transport disconnected");

    requests.complete({
      requestId: firstRequestId,
      status: "ok",
      result: "ignored",
    });
    requests.complete({
      requestId: secondRequestId,
      status: "err",
      message: "ignored",
    });

    expect(firstFailure).toHaveBeenCalledWith(expect.any(Error));
    expect(firstFailure.mock.calls[0]?.[0]).toMatchObject({ message: "transport disconnected" });
    expect(secondFailure).toHaveBeenCalledWith(expect.any(Error));
    expect(secondFailure.mock.calls[0]?.[0]).toMatchObject({ message: "transport disconnected" });
  });

  test("fail a request when its transport timeout expires", () => {
    vi.useFakeTimers();

    const failure = vi.fn();
    const requests = new ServerFunctionRequestRegistry({
      timeoutMs: 1_000,
      timeoutMessage: "transport timed out",
    });
    const requestId = requests.create({ failure });

    vi.advanceTimersByTime(1_000);

    expect(failure).toHaveBeenCalledOnce();
    expect(failure).toHaveBeenCalledWith(expect.any(Error));
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ message: "transport timed out" });

    requests.complete({
      requestId,
      status: "ok",
      result: "late response",
    });

    expect(failure).toHaveBeenCalledOnce();
  });

  test("cancel the transport timeout when a request completes", () => {
    vi.useFakeTimers();

    const success = vi.fn();
    const failure = vi.fn();
    const requests = new ServerFunctionRequestRegistry({
      timeoutMs: 1_000,
      timeoutMessage: "transport timed out",
    });
    const requestId = requests.create({ success, failure });

    requests.complete({
      requestId,
      status: "ok",
      result: "result",
    });
    vi.advanceTimersByTime(1_000);

    expect(success).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledWith("result");
    expect(failure).not.toHaveBeenCalled();
  });

  test("cancel transport timeouts when every pending request fails", () => {
    vi.useFakeTimers();

    const failure = vi.fn();
    const requests = new ServerFunctionRequestRegistry({
      timeoutMs: 1_000,
      timeoutMessage: "transport timed out",
    });

    requests.create({ failure });
    requests.failAll("transport disconnected");
    vi.advanceTimersByTime(1_000);

    expect(failure).toHaveBeenCalledOnce();
    expect(failure).toHaveBeenCalledWith(expect.any(Error));
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ message: "transport disconnected" });
  });
});
