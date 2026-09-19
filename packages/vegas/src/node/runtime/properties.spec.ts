import { describe, expect, test } from "vitest";

import { Properties, type HostBridge, type HostCall, type HostCallResult } from "./index";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);

    if (call.service !== "properties") {
      throw new Error("unexpected service");
    }

    switch (call.operation) {
      case "get":
        return (call.key === "name" ? "Vegas" : null) as HostCallResult<C>;
      case "getAll":
        return { name: "Vegas" } as HostCallResult<C>;
      case "getKeys":
        return ["name"] as HostCallResult<C>;
      case "set":
      case "merge":
      case "replace":
      case "remove":
      case "clear":
        return undefined as HostCallResult<C>;
      default:
        throw new Error(`unexpected Properties operation: ${call.operation}`);
    }
  }
}

describe("Properties Runtime object", () => {
  test("map Google-facing methods to semantic host operations and preserve chaining", () => {
    const bridge = new RecordingHostBridge();
    const properties = new Properties(bridge, "script");

    expect(properties.getProperty("name")).toBe("Vegas");
    expect(properties.getProperty("missing")).toBeNull();
    expect(properties.getProperties()).toStrictEqual({ name: "Vegas" });
    expect(properties.getKeys()).toStrictEqual(["name"]);

    expect(properties.setProperty("name", "Next")).toBe(properties);
    expect(properties.setProperties({ count: 3, enabled: true })).toBe(properties);
    expect(properties.setProperties({ replacement: 4 }, true)).toBe(properties);
    expect(properties.deleteProperty("name")).toBe(properties);
    expect(properties.deleteAllProperties()).toBe(properties);

    expect(bridge.calls).toStrictEqual([
      {
        service: "properties",
        operation: "get",
        namespace: "script",
        key: "name",
      },
      {
        service: "properties",
        operation: "get",
        namespace: "script",
        key: "missing",
      },
      {
        service: "properties",
        operation: "getAll",
        namespace: "script",
      },
      {
        service: "properties",
        operation: "getKeys",
        namespace: "script",
      },
      {
        service: "properties",
        operation: "set",
        namespace: "script",
        key: "name",
        value: "Next",
      },
      {
        service: "properties",
        operation: "merge",
        namespace: "script",
        values: {
          count: "3",
          enabled: "true",
        },
      },
      {
        service: "properties",
        operation: "replace",
        namespace: "script",
        values: {
          replacement: "4",
        },
      },
      {
        service: "properties",
        operation: "remove",
        namespace: "script",
        key: "name",
      },
      {
        service: "properties",
        operation: "clear",
        namespace: "script",
      },
    ]);
  });
});
