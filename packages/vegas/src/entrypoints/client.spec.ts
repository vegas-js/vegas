import { afterEach, describe, expect, expectTypeOf, test, vi } from "vitest";

import { createRpcClient, type RpcClient } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("exposes RpcClient as the registered RPC factory return type", () => {
  interface Contract {
    greet(name: string): string;
    hidden_(): void;
    label: string;
  }

  const rpc = createRpcClient<Contract>();

  expectTypeOf(rpc).toEqualTypeOf<RpcClient<Contract>>();
  expectTypeOf(rpc.greet).toEqualTypeOf<(name: string) => Promise<string>>();
});

test("excludes methods with unsupported transport signatures", () => {
  interface Contract {
    greet(name: string): string;
    notify(): void;
    invalidDate(date: Date): string;
    invalidResult(): Promise<string>;
    invalidUnknown(value: unknown): string;
    invalidCallback(callback: () => void): string;
    hidden_(): string;
  }

  expectTypeOf<RpcClient<Contract>>().toEqualTypeOf<{
    greet(name: string): Promise<string>;
    notify(): Promise<void>;
  }>();
});

test("does not expose reserved RPC names through the client proxy", () => {
  type Contract = {
    greet(name: string): string;
    constructor: () => string;
    prototype(): string;
    __proto__(): string;
    then(): string;
  };
  const rpc = createRpcClient<Contract>();

  expectTypeOf(rpc).toEqualTypeOf<{ greet(name: string): Promise<string> }>();
  for (const name of ["then", "constructor", "prototype", "__proto__", "private_"]) {
    expect(Reflect.get(rpc, name)).toBeUndefined();
  }
  expect(typeof rpc.greet).toBe("function");
});

describe("createRpcClient", () => {
  test("does not expose a thenable RPC proxy or symbol properties", async () => {
    const rpc = createRpcClient<{ greet(name: string): string; then(): string }>();

    expect(Reflect.get(rpc, "then")).toBeUndefined();
    expect(Reflect.get(rpc, Symbol.toStringTag)).toBeUndefined();
    await expect(Promise.resolve(rpc)).resolves.toBe(rpc);
  });

  test("dispatches registered RPC calls without exposing server implementation types", async () => {
    let successHandler: (value: unknown) => void = () => undefined;
    let failureHandler: (reason?: unknown) => void = () => undefined;
    const calls: unknown[][] = [];
    const run = {
      withSuccessHandler(handler: (value: unknown) => void) {
        successHandler = handler;
        return run;
      },
      withFailureHandler(handler: (reason?: unknown) => void) {
        failureHandler = handler;
        return run;
      },
      vegasRpcCall(name: string, ...args: unknown[]) {
        calls.push([name, ...args]);
        if (name === "fail") {
          failureHandler(new Error("rpc failure"));
        } else {
          successHandler(`Hello, ${String(args[0])}`);
        }
      },
    };

    vi.stubGlobal("google", { script: { run } });

    const rpc = createRpcClient<{
      greet(name: string): string;
      fail(): string;
    }>();

    await expect(rpc.greet("Vegas")).resolves.toBe("Hello, Vegas");
    await expect(rpc.fail()).rejects.toThrow("rpc failure");
    expect(calls).toStrictEqual([["greet", "Vegas"], ["fail"]]);
  });

  test("validates registered RPC arguments before calling google.script.run", async () => {
    let successHandler: (value: unknown) => void = () => undefined;
    const calls: unknown[][] = [];
    const run = {
      withSuccessHandler(handler: (value: unknown) => void) {
        successHandler = handler;
        return run;
      },
      withFailureHandler() {
        return run;
      },
      vegasRpcCall(name: string, value: unknown) {
        calls.push([name, value]);
        successHandler(value);
      },
    };
    vi.stubGlobal("google", { script: { run } });

    type EchoPayload = { items: (string | number | null)[] };
    const rpc = createRpcClient<{ echo(value: EchoPayload): EchoPayload }>();
    const data: EchoPayload = { items: ["Vegas", 1, null] };
    await expect(rpc.echo(data)).resolves.toBe(data);
    expect(calls).toStrictEqual([["echo", data]]);

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const getter = vi.fn(() => "unsafe");
    const accessor = Object.defineProperty({}, "secret", { get: getter });

    const sparse: number[] = [];
    sparse.length = 2;

    // Bypass the static contract deliberately to exercise the runtime boundary.
    const uncheckedEcho = rpc.echo as (value: unknown) => Promise<unknown>;
    for (const invalid of [
      new Date(),
      () => "callback",
      [undefined],
      cyclic,
      accessor,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      sparse,
    ]) {
      await expect(uncheckedEcho(invalid)).rejects.toThrow(/RPC transport value/);
    }

    expect(getter).not.toHaveBeenCalled();
    expect(calls).toStrictEqual([["echo", data]]);
  });
});
