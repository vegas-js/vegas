import { describe, expect, expectTypeOf, test } from "vitest";

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
