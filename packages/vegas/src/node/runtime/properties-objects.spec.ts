import { describe, expect, test } from "vitest";

import {
  createPropertiesService,
  Properties,
  PropertiesService,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

class RecordingHostBridge implements HostBridge {
  readonly calls: HostCall[] = [];
  readonly #respond: (call: HostCall) => unknown;

  constructor(respond: (call: HostCall) => unknown) {
    this.#respond = respond;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    this.calls.push(call);
    return this.#respond(call) as HostCallResult<C>;
  }
}

describe("Properties Runtime objects", () => {
  test("expose script and user stores as Classes and unavailable document store as null", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "properties" && call.operation === "isAvailable") {
        return call.namespace !== "document";
      }
      throw new Error("unexpected host call");
    });
    const service = createPropertiesService(bridge);

    expect(service).toBeInstanceOf(PropertiesService);
    expect(service.getScriptProperties()).toBeInstanceOf(Properties);
    expect(service.getUserProperties()).toBeInstanceOf(Properties);
    expect(service.getDocumentProperties()).toBeNull();

    expect(bridge.calls).toStrictEqual([
      {
        service: "properties",
        operation: "isAvailable",
        namespace: "document",
      },
    ]);
  });

  test("return a document Properties Class when the host has document context", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service === "properties" && call.operation === "isAvailable") {
        return true;
      }
      throw new Error("unexpected host call");
    });
    const properties = createPropertiesService(bridge).getDocumentProperties();

    expect(properties).toBeInstanceOf(Properties);
  });

  test("map Google-facing methods to semantic host operations and preserve chaining", () => {
    const bridge = new RecordingHostBridge((call) => {
      if (call.service !== "properties") {
        throw new Error("unexpected service");
      }

      switch (call.operation) {
        case "get":
          return call.key === "name" ? "Vegas" : null;
        case "getAll":
          return { name: "Vegas" };
        case "getKeys":
          return ["name"];
        case "isAvailable":
          return true;
        case "set":
        case "merge":
        case "replace":
        case "remove":
        case "clear":
          return undefined;
      }
    });
    const properties = createPropertiesService(bridge).getScriptProperties();

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
