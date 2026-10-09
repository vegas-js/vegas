import { afterEach, describe, expect, expectTypeOf, test, vi } from "vitest";

import {
  createRpcClient,
  createServerFunctionClient,
  type RpcClient,
  type ServerFunctionClient,
} from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("exposes RpcClient as the preferred type without changing legacy client types", () => {
  interface Contract {
    greet(name: string): string;
    hidden_(): void;
    label: string;
  }

  const rpc = createRpcClient<Contract>();
  const legacy = createServerFunctionClient<Contract>();

  expectTypeOf(rpc).toEqualTypeOf<RpcClient<Contract>>();
  expectTypeOf(legacy).toEqualTypeOf<ServerFunctionClient<Contract>>();
  expectTypeOf<ServerFunctionClient<Contract>>().toEqualTypeOf<RpcClient<Contract>>();
  expectTypeOf(rpc.greet).toEqualTypeOf<(name: string) => Promise<string>>();
  expectTypeOf(legacy.greet).toEqualTypeOf<(name: string) => Promise<string>>();
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

describe("createServerFunctionClient", () => {
  test("calls server functions through google.script.run", async () => {
    let successHandler: (value: unknown) => void = () => undefined;
    let failureHandler: (reason?: unknown) => void = () => undefined;

    const run = {
      withSuccessHandler(handler: (value: unknown) => void) {
        successHandler = handler;
        return run;
      },

      withFailureHandler(handler: (reason?: unknown) => void) {
        failureHandler = handler;
        return run;
      },

      greet(name: string) {
        successHandler(`Hello, ${name}`);
      },

      fail() {
        failureHandler(new Error("server failure"));
      },
    };

    vi.stubGlobal("google", {
      script: {
        run,
      },
    });

    const client = createServerFunctionClient<{
      greet(name: string): string;
      fail(): string;
    }>();

    await expect(client.greet("Vegas")).resolves.toBe("Hello, Vegas");
    await expect(client.fail()).rejects.toThrow("server failure");
  });

  test("does not expose a thenable RPC proxy or symbol properties", async () => {
    const rpc = createRpcClient<{ greet(name: string): string; then(): string }>();
    const legacy = createServerFunctionClient<{ greet(name: string): string }>();

    expect(Reflect.get(rpc, "then")).toBeUndefined();
    expect(Reflect.get(rpc, Symbol.toStringTag)).toBeUndefined();
    expect(Reflect.get(legacy, "then")).toBeUndefined();
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

    const rpc = createRpcClient<{ echo(value: unknown): unknown }>();
    const data = { items: ["Vegas", 1, null] };
    await expect(rpc.echo(data)).resolves.toBe(data);
    expect(calls).toStrictEqual([["echo", data]]);

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const getter = vi.fn(() => "unsafe");
    const accessor = Object.defineProperty({}, "secret", { get: getter });

    const sparse: number[] = [];
    sparse.length = 2;

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
      await expect(rpc.echo(invalid)).rejects.toThrow(/RPC transport value/);
    }

    expect(getter).not.toHaveBeenCalled();
    expect(calls).toStrictEqual([["echo", data]]);
  });
});
