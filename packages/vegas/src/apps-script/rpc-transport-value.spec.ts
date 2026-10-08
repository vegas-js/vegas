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

  test("accepts plain records across realms and with null prototypes", () => {
    const foreignRecord = vm.runInNewContext('({ name: "Vegas", scores: [1, 2] })') as unknown;
    const emptyPrototype = Object.assign(Object.create(null) as Record<string, unknown>, {
      name: "Vegas",
    });

    expect(() => assertRpcTransportValue(foreignRecord, "arguments[0]")).not.toThrow();
    expect(() => assertRpcTransportValue(emptyPrototype, "arguments[0]")).not.toThrow();
  });

  test("rejects custom prototypes without evaluating Symbol.toStringTag getters", () => {
    let inspected = 0;
    class TaggedRecord {
      get [Symbol.toStringTag]() {
        inspected++;
        return "Object";
      }
    }

    const tagged = new TaggedRecord();
    const ownTag = Object.defineProperty({}, Symbol.toStringTag, {
      get() {
        inspected++;
        return "Object";
      },
    });

    expect(() => assertRpcTransportValue(tagged, "arguments[0]")).toThrow(
      "Unsupported RPC transport value at arguments[0]",
    );
    expect(() => assertRpcTransportValue(ownTag, "arguments[0]")).toThrow(
      "Unsupported RPC transport value at arguments[0]",
    );
    expect(inspected).toBe(0);
  });
});
