import { describe, expect, test, vi } from "vitest";

import type { RuntimeServicePort } from "../../../runtime/protocol";
import { RuntimeScope } from "../../../runtime/scope";
import { Properties } from "./Properties";

function createPropertiesService(
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

test("getProperty passes scope and key", () => {
  const getProperty = vi.fn(() => "value");
  const properties = new Properties(RuntimeScope.SCRIPT, createPropertiesService({ getProperty }));

  expect(properties.getProperty("key")).toBe("value");
  expect(getProperty).toHaveBeenCalledOnce();
  expect(getProperty).toHaveBeenCalledWith(RuntimeScope.SCRIPT, "key");
});

test("setProperty passes scope, key and value", () => {
  const setProperty = vi.fn();
  const properties = new Properties(RuntimeScope.USER, createPropertiesService({ setProperty }));
  const result = properties.setProperty("key", "value");

  expect(setProperty).toHaveBeenCalledWith(RuntimeScope.USER, "key", "value");
  expect(result).toBe(properties);
});

describe("setProperties", () => {
  test("setProperties defaults deleteAllOthers to false", () => {
    const setProperties = vi.fn();
    const properties = new Properties(
      RuntimeScope.DOCUMENT,
      createPropertiesService({ setProperties }),
    );
    properties.setProperties({
      foo: "foo",
      bar: "bar",
    });

    expect(setProperties).toHaveBeenCalledWith(
      RuntimeScope.DOCUMENT,
      {
        foo: "foo",
        bar: "bar",
      },
      false,
    );
  });
  test("setProperties defaults deleteAllOthers to true", () => {
    const setProperties = vi.fn();
    const properties = new Properties(
      RuntimeScope.DOCUMENT,
      createPropertiesService({ setProperties }),
    );
    properties.setProperties(
      {
        foo: "foo",
      },
      true,
    );

    expect(setProperties).toHaveBeenCalledWith(
      RuntimeScope.DOCUMENT,
      {
        foo: "foo",
      },
      true,
    );
  });
});
