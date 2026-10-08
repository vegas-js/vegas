import { describe, expect, test, vi } from "vitest";

import { __vegasInternalRpcDispatch } from "./rpc-dispatcher";

describe("registered RPC dispatcher", () => {
  test("routes valid calls and allows void returns", () => {
    const handlers = {
      greet(name: string) {
        return `Hello, ${name}`;
      },
      noResult() {},
    };
    expect(__vegasInternalRpcDispatch(handlers, "greet", "Vegas")).toBe("Hello, Vegas");
    expect(__vegasInternalRpcDispatch(handlers, "noResult")).toBeUndefined();
  });

  test("binds the handler registry as the method receiver", () => {
    const handlers = {
      format(name: string) {
        return `Hello, ${name}`;
      },
      greet(name: string) {
        return this.format(name);
      },
    };

    expect(__vegasInternalRpcDispatch(handlers, "greet", "Vegas")).toBe("Hello, Vegas");
  });

  test("rejects private, inherited and accessor handlers", () => {
    const getter = vi.fn(() => () => "unsafe");
    const handlers = Object.defineProperty({ greet: () => "ok" }, "unsafe", { get: getter });
    for (const name of ["unsafe", "then", "private_", "constructor", "__proto__", "missing"]) {
      expect(() => __vegasInternalRpcDispatch(handlers, name)).toThrow(
        "Unknown or private RPC handler",
      );
    }
    expect(getter).not.toHaveBeenCalled();
  });

  test("validates arguments before invoking handlers and validates results", () => {
    const echo = vi.fn((value: unknown) => value);
    const handlers = { echo, dateResult: () => new Date() };
    expect(__vegasInternalRpcDispatch(handlers, "echo", { items: [1, "Vegas"] })).toEqual({
      items: [1, "Vegas"],
    });
    expect(() => __vegasInternalRpcDispatch(handlers, "echo", new Date())).toThrow(
      "Unsupported RPC transport value at arguments[0]",
    );
    expect(echo).toHaveBeenCalledTimes(1);
    expect(() => __vegasInternalRpcDispatch(handlers, "dateResult")).toThrow(
      "Unsupported RPC transport value at return",
    );
  });
});
