import { describe, expect, test, vi } from "vitest";

import { ServerFunctionRequestRegistry } from "./server-function-requests";

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

  test("fail a pending request once", () => {
    const failure = vi.fn();
    const requests = new ServerFunctionRequestRegistry();
    const requestId = requests.create({ failure });

    requests.fail(requestId, "disconnected");
    requests.fail(requestId, "ignored");

    expect(failure).toHaveBeenCalledOnce();
    expect(failure).toHaveBeenCalledWith("disconnected");
  });

  test("report an unhandled failure", () => {
    const reportUnhandledFailure = vi.fn();
    const requests = new ServerFunctionRequestRegistry(reportUnhandledFailure);
    const requestId = requests.create({});

    requests.complete({
      requestId,
      status: "err",
      message: "server failure",
    });

    expect(reportUnhandledFailure).toHaveBeenCalledWith("server failure");
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

    expect(firstFailure).toHaveBeenCalledWith("transport disconnected");
    expect(secondFailure).toHaveBeenCalledWith("transport disconnected");
  });
});
