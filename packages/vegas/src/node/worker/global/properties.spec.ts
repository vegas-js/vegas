import { expect, test, vi } from "vitest";

import { RuntimeServicePort } from "../../runtime/protocol";
import { RuntimeScope } from "../../runtime/scope";
import { createPropertiesService } from "./properties";

interface PropertiesFacade {
  deleteAllProperties(): PropertiesFacade;
  deleteProperty(key: string): PropertiesFacade;
  getKeys(): string[];
  getProperties(): Record<string, string>;
  getProperty(key: string): string | null;
  setProperties(properties: Record<string, string>, deleteAllOthers?: boolean): PropertiesFacade;
  setProperty(key: string, value: string): PropertiesFacade;
  toString(): string;
}

interface PropertiesServiceFacade {
  getDocumentProperties(): PropertiesFacade | null;
  getScriptProperties(): PropertiesFacade;
  getUserProperties(): PropertiesFacade;
  toString(): string;
}

function createPropertiesServiceStub(
  overrides: Partial<RuntimeServicePort<"Properties">> = {},
): RuntimeServicePort<"Properties"> {
  return {
    deleteAllProperties: () => {},
    deleteProperty: () => {},
    getKeys: () => [],
    getProperties: () => ({}),
    getProperty: () => null,
    setProperties: () => {},
    setProperty: () => {},
    ...overrides,
  };
}

function createStatefulPropertiesService(): RuntimeServicePort<"Properties"> {
  const stores = new Map<RuntimeScope, Map<string, string>>();

  const getStore = (scope: RuntimeScope): Map<string, string> => {
    const existing = stores.get(scope);

    if (existing) {
      return existing;
    }

    const created = new Map<string, string>();
    stores.set(scope, created);
    return created;
  };

  return {
    deleteAllProperties: (scope) => {
      getStore(scope).clear();
    },

    deleteProperty: (scope, key) => {
      getStore(scope).delete(key);
    },

    getKeys: (scope) => {
      return [...getStore(scope).keys()];
    },

    getProperties: (scope) => {
      return Object.fromEntries(getStore(scope));
    },

    getProperty: (scope, key) => {
      return getStore(scope).get(key) ?? null;
    },

    setProperties: (scope, properties, deleteAllOthers) => {
      const store = getStore(scope);

      if (deleteAllOthers) {
        store.clear();
      }

      for (const [key, value] of Object.entries(properties)) {
        store.set(key, value);
      }
    },

    setProperty: (scope, key, value) => {
      getStore(scope).set(key, value);
    },
  };
}

function createFacade(
  service: RuntimeServicePort<"Properties">,
  documentPropertiesAvailable = true,
): PropertiesServiceFacade {
  return createPropertiesService(service, {
    documentPropertiesAvailable,
    createObject: () => ({}),
  }) as unknown as PropertiesServiceFacade;
}

test("returns a fresh ScriptProperties facade for each call", () => {
  const propertiesService = createFacade(createPropertiesServiceStub());

  const first = propertiesService.getScriptProperties();
  const second = propertiesService.getScriptProperties();

  expect(first).not.toBe(second);

  expect(String(first)).toBe("ScriptProperties");
  expect(String(second)).toBe("ScriptProperties");

  expect(Object.getPrototypeOf(first)).toBe(Object.prototype);
  expect(Object.getPrototypeOf(second)).toBe(Object.prototype);
});

test("shares the ScriptProperties backing store across facades", () => {
  const propertiesService = createFacade(createStatefulPropertiesService());

  const first = propertiesService.getScriptProperties();
  const second = propertiesService.getScriptProperties();

  first.setProperty("key", "value");

  expect(first).not.toBe(second);
  expect(second.getProperty("key")).toBe("value");
});

test("returns the receiver from chainable Properties methods", () => {
  const propertiesService = createFacade(createPropertiesServiceStub());
  const properties = propertiesService.getScriptProperties();

  expect(properties.setProperty("key", "value")).toBe(properties);

  expect(
    properties.setProperties({
      foo: "bar",
    }),
  ).toBe(properties);

  expect(properties.deleteProperty("key")).toBe(properties);
  expect(properties.deleteAllProperties()).toBe(properties);
});

test("uses separate scopes for ScriptProperties and UserProperties", () => {
  const setProperty = vi.fn();

  const propertiesService = createFacade(
    createPropertiesServiceStub({
      setProperty,
    }),
  );

  const script = propertiesService.getScriptProperties();
  const user = propertiesService.getUserProperties();

  script.setProperty("key", "script");
  user.setProperty("key", "user");

  expect(setProperty).toHaveBeenCalledWith(RuntimeScope.SCRIPT, "key", "script");

  expect(setProperty).toHaveBeenCalledWith(RuntimeScope.USER, "key", "user");
});

test("returns null when DocumentProperties are unavailable", () => {
  const propertiesService = createFacade(createPropertiesServiceStub(), false);

  expect(propertiesService.getDocumentProperties()).toBeNull();
});

test("creates DocumentProperties when they are available", () => {
  const propertiesService = createFacade(createPropertiesServiceStub(), true);

  const first = propertiesService.getDocumentProperties();
  const second = propertiesService.getDocumentProperties();

  expect(first).not.toBeNull();
  expect(second).not.toBeNull();

  if (first === null || second === null) {
    throw new Error("Expected DocumentProperties to be available");
  }

  expect(first).not.toBe(second);

  expect(String(first)).toBe("DocumentProperties");
  expect(String(second)).toBe("DocumentProperties");

  expect(Object.getPrototypeOf(first)).toBe(Object.prototype);
  expect(Object.getPrototypeOf(second)).toBe(Object.prototype);
});
