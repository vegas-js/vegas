import { describe, expect, expectTypeOf, test, vi } from "vitest";

import { __vegasInternalRpcDispatch } from "./rpc-dispatcher";
import { isPublicRpcHandlerName } from "./rpc-handler-name";
import { defineServerFunctions, type ServerFunctionHandlers } from "./server-functions";

describe("registered RPC handler names", () => {
  test("accepts ordinary names but rejects private and reserved names", () => {
    expect(isPublicRpcHandlerName("greet")).toBe(true);
    for (const name of ["then", "constructor", "prototype", "__proto__", "private_"]) {
      expect(isPublicRpcHandlerName(name)).toBe(false);
    }
    expect(isPublicRpcHandlerName(Symbol("greet"))).toBe(false);
  });

  test("rejects reserved own methods at registration and dispatch", () => {
    for (const name of ["constructor", "prototype", "__proto__"]) {
      const forbidden = vi.fn(() => "unsafe");
      const handlers = Object.defineProperty({ greet: () => "ok" }, name, {
        value: forbidden,
        configurable: true,
        enumerable: true,
      });

      expect(() =>
        defineServerFunctions<{ greet(): string }>(
          handlers as ServerFunctionHandlers<{ greet(): string }>,
        ),
      ).toThrow(`Invalid RPC handler: ${name}`);
      expect(() => __vegasInternalRpcDispatch(handlers, name)).toThrow(
        `Unknown or private RPC handler: ${name}`,
      );
      expect(forbidden).not.toHaveBeenCalled();
      expect(__vegasInternalRpcDispatch(handlers, "greet")).toBe("ok");
    }
  });

  test("excludes reserved names from registered contract types", () => {
    type Contract = {
      greet(name: string): string;
      constructor: () => string;
      prototype(): string;
      __proto__(): string;
      then(): string;
    };

    expectTypeOf<ServerFunctionHandlers<Contract>>().toEqualTypeOf<{
      greet(name: string): string;
      constructor: never;
      prototype: never;
      __proto__: never;
      then: never;
    }>();
  });
});
