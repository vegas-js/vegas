import { describe, expect, test } from "vitest";

import { RuntimeScope } from "../../scope";
import type { PropertiesStore } from "./properties";
import { PropertiesHandler } from "./properties";

function createStore(): PropertiesStore {
  return {
    document: {},
    script: {},
    user: {},
  };
}

test("sets, gets and deletes property", () => {
  const handler = new PropertiesHandler(createStore());

  handler.setProperty(RuntimeScope.SCRIPT, "foo", "bar");
  expect(handler.getProperty(RuntimeScope.SCRIPT, "foo")).toBe("bar");

  handler.deleteProperty(RuntimeScope.SCRIPT, "foo");
  expect(handler.getProperty(RuntimeScope.SCRIPT, "foo")).toBeNull();
});

test("isolates properties by scope", () => {
  const handler = new PropertiesHandler(createStore());
  handler.setProperty(RuntimeScope.DOCUMENT, "key", "document");
  handler.setProperty(RuntimeScope.SCRIPT, "key", "script");
  handler.setProperty(RuntimeScope.USER, "key", "user");

  expect(handler.getProperty(RuntimeScope.DOCUMENT, "key")).toBe("document");
  expect(handler.getProperty(RuntimeScope.SCRIPT, "key")).toBe("script");
  expect(handler.getProperty(RuntimeScope.USER, "key")).toBe("user");
});

describe("setProperties", () => {
  test("setProperties preserves existing values", () => {
    const handler = new PropertiesHandler(createStore());
    handler.setProperty(RuntimeScope.SCRIPT, "existing", "value");
    handler.setProperties(
      RuntimeScope.SCRIPT,
      {
        added: "new",
      },
      false,
    );

    expect(handler.getProperties(RuntimeScope.SCRIPT)).toEqual({
      existing: "value",
      added: "new",
    });
  });

  test("setProperties replaces existing values when deleteAllOthers is true", () => {
    const handler = new PropertiesHandler(createStore());
    handler.setProperty(RuntimeScope.SCRIPT, "existing", "value");
    handler.setProperties(
      RuntimeScope.SCRIPT,
      {
        added: "new",
      },
      true,
    );

    expect(handler.getProperties(RuntimeScope.SCRIPT)).toEqual({
      added: "new",
    });
  });
});
