import vm from "node:vm";

import { describe, expect, test } from "vitest";

import { assertRpcTransportValue } from "./rpc-transport-value";

describe("RPC transport runtime validator", () => {
  test("accepts data records, shared references and a void return", () => {
    const shared = { value: "Vegas" };
    const value = { first: shared, second: shared, list: [null, 42, true] };

    expect(() => assertRpcTransportValue(value, "arguments[0]")).not.toThrow();
    expect(() => assertRpcTransportValue(undefined, "return", true)).not.toThrow();
    expect(() => assertRpcTransportValue(undefined, "arguments[0]")).toThrow(
      "Unsupported RPC transport value at arguments[0]",
    );
    expect(() => assertRpcTransportValue({ value: undefined }, "return", true)).toThrow(
      'Unsupported RPC transport value at return["value"]',
    );
  });

  test("rejects unsupported values without accessing getter properties", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    let accessed = false;
    const accessor = Object.defineProperty({}, "secret", {
      get() {
        accessed = true;
        return "hidden";
      },
    });

    for (const invalid of [new Date(), () => "callback", [undefined], accessor]) {
      expect(() => assertRpcTransportValue(invalid, "arguments[0]")).toThrow(
        /Unsupported RPC transport value/,
      );
    }
    expect(() => assertRpcTransportValue(cyclic, "arguments[0]")).toThrow(
      "Cyclic RPC transport value at arguments[0]",
    );
    expect(accessed).toBe(false);
  });

  test("runs as a self-contained function in a GAS-style VM", () => {
    const context = vm.createContext({});
    const embedded = new vm.Script(`(${assertRpcTransportValue.toString()})`).runInContext(
      context,
    ) as typeof assertRpcTransportValue;

    expect(() => embedded({ items: ["Vegas", 1, null] }, "arguments[0]")).not.toThrow();
    expect(() => embedded(new Date(), "arguments[0]")).toThrow(
      "Unsupported RPC transport value at arguments[0]",
    );
    expect(() => embedded(undefined, "return", true)).not.toThrow();
    expect(() => embedded([undefined], "return", true)).toThrow(
      'Unsupported RPC transport value at return["0"]',
    );
  });
});
