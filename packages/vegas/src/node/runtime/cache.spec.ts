import { describe, expect, test } from "vitest";

import { Cache, type HostBridge, type HostCall, type HostCallResult } from "./index";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "cache") {
      throw new Error(`unexpected host service: ${call.service}`);
    }

    switch (call.operation) {
      case "get": {
        return (call.key === "found" ? "value" : null) as unknown as HostCallResult<C>;
      }
      case "getAll": {
        return Object.fromEntries(
          call.keys.flatMap((key) => (key === "found" ? [[key, "value"]] : [])),
        ) as unknown as HostCallResult<C>;
      }
      case "put":
      case "putAll":
      case "remove":
      case "removeAll": {
        return undefined as unknown as HostCallResult<C>;
      }
      default:
        throw new Error(`unexpected Cache operation: ${call.operation}`);
    }
  }
}

describe("Cache Runtime object", () => {
  test("map methods to semantic host calls with default and explicit expiration", () => {
    const bridge = new RecordingHostBridge();
    const cache = new Cache(bridge, "script");

    expect(cache.get("missing")).toBeNull();
    expect(cache.getAll(["found", "missing"])).toStrictEqual({
      found: "value",
    });
    cache.put("first", "one");
    cache.put("second", "two", 20);
    cache.putAll({
      third: "three",
    });
    cache.putAll(
      {
        fourth: "four",
      },
      30,
    );
    cache.remove("first");
    cache.removeAll(["second", "third"]);

    expect(bridge.calls).toStrictEqual([
      {
        service: "cache",
        operation: "get",
        namespace: "script",
        key: "missing",
      },
      {
        service: "cache",
        operation: "getAll",
        namespace: "script",
        keys: ["found", "missing"],
      },
      {
        service: "cache",
        operation: "put",
        namespace: "script",
        key: "first",
        value: "one",
        expirationInSeconds: 600,
      },
      {
        service: "cache",
        operation: "put",
        namespace: "script",
        key: "second",
        value: "two",
        expirationInSeconds: 20,
      },
      {
        service: "cache",
        operation: "putAll",
        namespace: "script",
        values: {
          third: "three",
        },
        expirationInSeconds: 600,
      },
      {
        service: "cache",
        operation: "putAll",
        namespace: "script",
        values: {
          fourth: "four",
        },
        expirationInSeconds: 30,
      },
      {
        service: "cache",
        operation: "remove",
        namespace: "script",
        key: "first",
      },
      {
        service: "cache",
        operation: "removeAll",
        namespace: "script",
        keys: ["second", "third"],
      },
    ]);
  });

  test("reject invalid expiration before issuing a host call", () => {
    const bridge = new RecordingHostBridge();
    const cache = new Cache(bridge, "script");

    expect(() => cache.put("key", "value", 0)).toThrow(
      "Local Cache expiration must be an integer from 1 to 21600 seconds.",
    );
    expect(() => cache.put("key", "value", 21_601)).toThrow(
      "Local Cache expiration must be an integer from 1 to 21600 seconds.",
    );
    expect(() => cache.put("key", "value", 1.5)).toThrow(
      "Local Cache expiration must be an integer from 1 to 21600 seconds.",
    );
    expect(bridge.calls).toStrictEqual([]);
  });

  test("enforce local write-size boundaries before issuing a host call", () => {
    const bridge = new RecordingHostBridge();
    const cache = new Cache(bridge, "script");

    expect(() => cache.put("x".repeat(251), "value")).toThrow(
      "Local Cache key exceeds the 250 character limit.",
    );
    expect(() => cache.put("key", "x".repeat(100_001))).toThrow(
      "Local Cache value exceeds the 100 KB limit.",
    );
    expect(bridge.calls).toStrictEqual([]);

    cache.put("x".repeat(250), "x".repeat(100_000), 1);

    expect(bridge.calls).toHaveLength(1);
  });
});
