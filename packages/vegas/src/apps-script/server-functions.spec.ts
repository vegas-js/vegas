import vm from "node:vm";

import { describe, expect, expectTypeOf, test, vi } from "vitest";

import { __vegasInternalRpcDispatch } from "./rpc-dispatcher";
import { defineServerFunctions, type ServerFunctionHandlers } from "./server-functions";

interface ServerRpc {
  greet(name: string): string;
  add(a: number, b: number): number;
}

describe("defineServerFunctions", () => {
  test("preserves handlers and checks a standalone RPC contract", () => {
    const handlers = {
      greet(name: string) {
        return `Hello, ${name}`;
      },
      add(a: number, b: number) {
        return a + b;
      },
    };

    const defined = defineServerFunctions<ServerRpc>(handlers);

    expect(defined).toBe(handlers);
    expect(defined.greet("Vegas")).toBe("Hello, Vegas");
    expect(defined.add(2, 3)).toBe(5);
    expectTypeOf(defined.greet).toEqualTypeOf<(name: string) => string>();
    expectTypeOf(defined.add).toEqualTypeOf<(a: number, b: number) => number>();
  });

  test("rejects malformed runtime registrations", () => {
    const register = (handlers: object) =>
      defineServerFunctions<{ greet(): string }>(
        handlers as ServerFunctionHandlers<{ greet(): string }>,
      );

    expect(() => register({ greet: "not a function" })).toThrow("Invalid RPC handler: greet");
    expect(() =>
      register({
        greet() {
          return "ok";
        },
        secret_() {
          return "hidden";
        },
      }),
    ).toThrow("Invalid RPC handler: secret_");
    const reservedName = ["th", "en"].join("");
    const reservedHandler = Object.defineProperty({ greet: () => "ok" }, reservedName, {
      value: () => "bad",
    });
    expect(() => register(reservedHandler)).toThrow("Invalid RPC handler: then");
    expect(() => register([])).toThrow("RPC handlers must be an object.");

    const accessor = Object.defineProperty({}, "greet", { get: () => () => "ok" });
    expect(() => register(accessor)).toThrow("Invalid RPC handler: greet");
    const symbol = {
      greet() {
        return "ok";
      },
      [Symbol.toStringTag]: "rpc",
    };
    expect(() => register(symbol)).toThrow("Invalid RPC handler: Symbol(Symbol.toStringTag)");
  });

  test("rejects registries with inherited or class-prototype methods", () => {
    const register = (handlers: object) =>
      defineServerFunctions<{ greet(): string }>(
        handlers as ServerFunctionHandlers<{ greet(): string }>,
      );

    class InheritedHandlers {
      greet() {
        return "Hello";
      }
    }
    class OwnHandlers {
      greet = () => "Hello";
    }

    for (const invalid of [new InheritedHandlers(), new OwnHandlers(), new Date()]) {
      expect(() => register(invalid)).toThrow("RPC handlers must be a plain object.");
    }

    const inherited = Object.create({ greet: () => "Hello" }) as object;
    expect(() => register(inherited)).toThrow("RPC handlers must be a plain object.");
  });

  test("does not expose added or replaced registered handlers", () => {
    const original = vi.fn(() => "original");
    const replacement = vi.fn(() => "replacement");
    const added = vi.fn(() => "added");
    const handlers: { greet(): string; added?: () => string } = { greet: original };

    expect(defineServerFunctions<{ greet(): string }>(handlers)).toBe(handlers);
    expect(__vegasInternalRpcDispatch(handlers, "greet")).toBe("original");

    handlers.greet = replacement;
    handlers.added = added;
    expect(() => __vegasInternalRpcDispatch(handlers, "greet")).toThrow(
      "Unknown or private RPC handler: greet",
    );
    expect(() => __vegasInternalRpcDispatch(handlers, "added")).toThrow(
      "Unknown or private RPC handler: added",
    );
    expect(replacement).not.toHaveBeenCalled();
    expect(added).not.toHaveBeenCalled();

    handlers.greet = original;
    expect(__vegasInternalRpcDispatch(handlers, "greet")).toBe("original");

    // Re-registering the same object deliberately replaces its approved set.
    defineServerFunctions<{ greet(): string; added(): string }>(
      handlers as { greet(): string; added(): string },
    );
    expect(__vegasInternalRpcDispatch(handlers, "added")).toBe("added");
  });

  test("rejects a registered method turned into an accessor without executing it", () => {
    const getter = vi.fn(() => () => "unsafe");
    const handlers = defineServerFunctions<{ greet(): string }>({ greet: () => "ok" });
    Object.defineProperty(handlers, "greet", { configurable: true, get: getter });

    expect(() => __vegasInternalRpcDispatch(handlers, "greet")).toThrow(
      "Unknown or private RPC handler: greet",
    );
    expect(getter).not.toHaveBeenCalled();
  });

  test("still dispatches a plain registry without defineServerFunctions", () => {
    const handlers = { greet: () => "original" };
    expect(__vegasInternalRpcDispatch(handlers, "greet")).toBe("original");
    handlers.greet = () => "replacement";
    expect(__vegasInternalRpcDispatch(handlers, "greet")).toBe("replacement");
  });

  test("accepts a null-prototype handler registry without copying it", () => {
    const handlers = Object.assign(Object.create(null) as object, {
      greet: () => "Hello",
    });
    expect(defineServerFunctions<{ greet(): string }>(handlers)).toBe(handlers);
    expect(__vegasInternalRpcDispatch(handlers, "greet")).toBe("Hello");
  });

  test("accepts an object literal created in a different JavaScript realm", () => {
    const handlers = vm.runInNewContext('({ greet() { return "Hello"; } })') as {
      greet(): string;
    };
    expect(defineServerFunctions<{ greet(): string }>(handlers)).toBe(handlers);
    expect(__vegasInternalRpcDispatch(handlers, "greet")).toBe("Hello");
  });

  test("rejects private names and non-function members at the type boundary", () => {
    type InvalidRpc = {
      greet(name: string): string;
      secret_(): string;
      version: string;
    };

    expectTypeOf<ServerFunctionHandlers<InvalidRpc>>().toEqualTypeOf<{
      greet(name: string): string;
      secret_: never;
      version: never;
    }>();
    expectTypeOf<ServerFunctionHandlers<{ then(): string }>>().toEqualTypeOf<{
      then: never;
    }>();
  });
});
