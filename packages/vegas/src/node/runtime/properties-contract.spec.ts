import { describe, expect, test } from "vitest";

import {
  createPropertiesService,
  Properties,
  type HostBridge,
  type HostCall,
  type HostCallResult,
} from "./index";

type PropertiesNamespace = "document" | "script" | "user";

// Public contracts:
// https://developers.google.com/apps-script/reference/properties/properties-service
// https://developers.google.com/apps-script/reference/properties/properties
// https://developers.google.com/apps-script/guides/properties
class StatefulPropertiesBridge implements HostBridge {
  readonly #documentAvailable: boolean;
  readonly #stores = new Map<PropertiesNamespace, Map<string, string>>([
    ["document", new Map()],
    ["script", new Map()],
    ["user", new Map()],
  ]);

  constructor(documentAvailable = true) {
    this.#documentAvailable = documentAvailable;
  }

  call<C extends HostCall>(call: C): HostCallResult<C> {
    if (call.service !== "properties") {
      throw new Error("unexpected host service");
    }

    const store = this.#stores.get(call.namespace);

    if (store === undefined) {
      throw new Error(`unexpected Properties namespace: ${call.namespace}`);
    }

    switch (call.operation) {
      case "isAvailable":
        return (call.namespace !== "document" || this.#documentAvailable) as HostCallResult<C>;
      case "get":
        return (store.get(call.key) ?? null) as HostCallResult<C>;
      case "getAll":
        return Object.fromEntries(store) as HostCallResult<C>;
      case "getKeys":
        return [...store.keys()] as HostCallResult<C>;
      case "set":
        store.set(call.key, call.value);
        return undefined as HostCallResult<C>;
      case "merge":
        for (const [key, value] of Object.entries(call.values)) {
          store.set(key, value);
        }
        return undefined as HostCallResult<C>;
      case "replace":
        store.clear();
        for (const [key, value] of Object.entries(call.values)) {
          store.set(key, value);
        }
        return undefined as HostCallResult<C>;
      case "remove":
        store.delete(call.key);
        return undefined as HostCallResult<C>;
      case "clear":
        store.clear();
        return undefined as HostCallResult<C>;
    }
  }
}

describe("PropertiesService public contract", () => {
  test("expose script and user stores while document availability follows the host context", () => {
    const unavailable = createPropertiesService(new StatefulPropertiesBridge(false));

    expect(unavailable.getScriptProperties()).toBeInstanceOf(Properties);
    expect(unavailable.getUserProperties()).toBeInstanceOf(Properties);
    expect(unavailable.getDocumentProperties()).toBeNull();

    const available = createPropertiesService(new StatefulPropertiesBridge(true));

    expect(available.getDocumentProperties()).toBeInstanceOf(Properties);
  });

  test("keep script and user property stores scoped independently", () => {
    const service = createPropertiesService(new StatefulPropertiesBridge());
    const scriptProperties = service.getScriptProperties();
    const userProperties = service.getUserProperties();

    scriptProperties.setProperty("scope", "script");
    userProperties.setProperty("scope", "user");

    expect(scriptProperties.getProperty("scope")).toBe("script");
    expect(userProperties.getProperty("scope")).toBe("user");
  });
});

describe("Properties public contract", () => {
  test("read, write, replace, copy, and delete property values", () => {
    const properties = createPropertiesService(
      new StatefulPropertiesBridge(),
    ).getScriptProperties();

    expect(properties.getProperty("missing")).toBeNull();
    expect(properties.setProperty("name", "Vegas")).toBe(properties);
    expect(properties.setProperties({ count: 3, enabled: true })).toBe(properties);
    expect(properties.getProperties()).toStrictEqual({
      name: "Vegas",
      count: "3",
      enabled: "true",
    });
    expect(properties.getKeys().sort()).toStrictEqual(["count", "enabled", "name"]);

    const copy = properties.getProperties();
    copy.name = "Changed locally";

    expect(properties.getProperty("name")).toBe("Vegas");

    expect(properties.setProperties({ replacement: "only" }, true)).toBe(properties);
    expect(properties.getProperties()).toStrictEqual({
      replacement: "only",
    });

    expect(properties.deleteProperty("replacement")).toBe(properties);
    expect(properties.getProperty("replacement")).toBeNull();

    properties.setProperties({ first: "1", second: "2" });
    expect(properties.deleteAllProperties()).toBe(properties);
    expect(properties.getProperties()).toStrictEqual({});
  });
});
