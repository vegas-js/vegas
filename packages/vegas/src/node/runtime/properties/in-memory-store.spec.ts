import { describe, expect, test } from "vitest";

import { InMemoryPropertiesStore } from "./in-memory-store";
import type { PropertiesNamespace } from "./store";

const scriptProperties: PropertiesNamespace = {
  kind: "script",
  scriptKey: "script-a",
};

const userProperties: PropertiesNamespace = {
  kind: "user",
  scriptKey: "script-a",
  userKey: "user-a",
};

// https://developers.google.com/apps-script/reference/properties/properties-service
describe("InMemoryPropertiesStore namespace", () => {
  test("isolate script and user property namespaces", async () => {
    const store = new InMemoryPropertiesStore();

    await store.set(scriptProperties, "key", "script-value");
    await store.set(userProperties, "key", "user-value");
    await store.set(
      {
        kind: "user",
        scriptKey: "script-a",
        userKey: "user-b",
      },
      "key",
      "other-user-value",
    );
    await store.set(
      {
        kind: "script",
        scriptKey: "script-b",
      },
      "key",
      "other-script-value",
    );

    expect(await store.get(scriptProperties, "key")).toBe("script-value");
    expect(await store.get(userProperties, "key")).toBe("user-value");
    expect(
      await store.get(
        {
          kind: "user",
          scriptKey: "script-a",
          userKey: "user-b",
        },
        "key",
      ),
    ).toBe("other-user-value");
    expect(
      await store.get(
        {
          kind: "script",
          scriptKey: "script-b",
        },
        "key",
      ),
    ).toBe("other-script-value");
  });
});

// https://developers.google.com/apps-script/reference/properties/properties
describe("InMemoryPropertiesStore values", () => {
  test("return undefined for a missing property", async () => {
    const store = new InMemoryPropertiesStore();

    expect(await store.get(scriptProperties, "missing")).toBeUndefined();
  });

  test("return a detached copy of all properties", async () => {
    const store = new InMemoryPropertiesStore();

    await store.setAll(scriptProperties, {
      first: "one",
      second: "two",
    });

    const values = await store.getAll(scriptProperties);
    values.first = "changed";
    delete values.second;

    expect(await store.getAll(scriptProperties)).toStrictEqual({
      first: "one",
      second: "two",
    });
  });

  test("preserve special property keys across local writes and reads", async () => {
    const store = new InMemoryPropertiesStore();

    await store.set(scriptProperties, "__proto__", "prototype-value");
    await store.setAll(
      scriptProperties,
      Object.fromEntries([
        ["constructor", "constructor-value"],
        ["toString", "method-value"],
      ]),
    );

    const properties = await store.getAll(scriptProperties);
    expect(properties).toStrictEqual(
      Object.fromEntries([
        ["__proto__", "prototype-value"],
        ["constructor", "constructor-value"],
        ["toString", "method-value"],
      ]),
    );
    expect(Object.getPrototypeOf(properties)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(properties, "__proto__")?.value).toBe("prototype-value");

    await store.replaceAll(
      scriptProperties,
      Object.fromEntries([["__proto__", "replacement-value"]]),
    );
    const replacement = await store.getAll(scriptProperties);
    expect(Object.keys(replacement)).toStrictEqual(["__proto__"]);
    expect(Object.getOwnPropertyDescriptor(replacement, "__proto__")?.value).toBe(
      "replacement-value",
    );
    await expect(store.clone().get(scriptProperties, "__proto__")).resolves.toBe(
      "replacement-value",
    );
  });

  test("clone all namespaces without sharing mutations", async () => {
    const store = new InMemoryPropertiesStore();
    const documentProperties: PropertiesNamespace = {
      kind: "document",
      scriptKey: "script-a",
      documentKey: "document-a",
    };

    await store.setAll(scriptProperties, {
      script: "before clone",
    });
    await store.setAll(userProperties, {
      user: "before clone",
    });
    await store.setAll(documentProperties, {
      document: "before clone",
    });

    const clone = store.clone();

    await store.set(scriptProperties, "script", "original update");
    await clone.set(userProperties, "user", "clone update");
    await clone.clear(documentProperties);

    expect(await clone.getAll(scriptProperties)).toStrictEqual({
      script: "before clone",
    });
    expect(await store.getAll(userProperties)).toStrictEqual({
      user: "before clone",
    });
    expect(await store.getAll(documentProperties)).toStrictEqual({
      document: "before clone",
    });
    expect(await clone.getAll(userProperties)).toStrictEqual({
      user: "clone update",
    });
    expect(await clone.getAll(documentProperties)).toStrictEqual({});
  });

  test("merge and replace property values", async () => {
    const store = new InMemoryPropertiesStore();

    await store.setAll(scriptProperties, {
      first: "one",
      keep: "keep",
    });
    await store.setAll(scriptProperties, {
      first: "updated",
      added: "added",
    });

    expect(await store.getAll(scriptProperties)).toStrictEqual({
      first: "updated",
      keep: "keep",
      added: "added",
    });

    await store.replaceAll(scriptProperties, {
      replacement: "value",
    });

    expect(await store.getAll(scriptProperties)).toStrictEqual({
      replacement: "value",
    });
  });

  test("remove one property and clear the namespace", async () => {
    const store = new InMemoryPropertiesStore();

    await store.setAll(scriptProperties, {
      first: "one",
      second: "two",
    });

    await store.remove(scriptProperties, "first");

    expect(await store.getAll(scriptProperties)).toStrictEqual({
      second: "two",
    });

    await store.clear(scriptProperties);

    expect(await store.getAll(scriptProperties)).toStrictEqual({});
  });
});
