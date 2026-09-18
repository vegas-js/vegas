import { describe, expect, expectTypeOf, test } from "vitest";

import {
  InMemoryPropertiesStore,
  resolvePropertiesNamespace,
  type InvocationScope,
} from "../../runtime";
import { applyPropertiesRuntimeData, type LoadedRuntimeData } from "./runtime-data";

describe("runtime data", () => {
  test("keep loaded Session data explicit instead of storing it on ServeContext", () => {
    expectTypeOf<LoadedRuntimeData>().toEqualTypeOf<{
      readonly session?: {
        activeUserEmail?: string;
        activeUserLocale?: string;
        effectiveUserEmail?: string;
        temporaryActiveUserKey?: string;
      };
    }>();
  });
});

describe("applyPropertiesRuntimeData", () => {
  test("replace runtime property data in each available namespace", async () => {
    const store = new InMemoryPropertiesStore();
    const scope: InvocationScope = {
      scriptKey: "script-a",
      userKey: "user-a",
      documentKey: "document-a",
    };

    const script = resolvePropertiesNamespace(scope, "script");
    const user = resolvePropertiesNamespace(scope, "user");
    const document = resolvePropertiesNamespace(scope, "document");

    if (!script || !user || !document) {
      throw new Error("expected all property namespaces");
    }

    await store.set(script, "stale", "value");
    await store.set(user, "stale", "value");
    await store.set(document, "stale", "value");

    await applyPropertiesRuntimeData(store, scope, {
      scriptProperties: {
        script: "value",
      },
      userProperties: {
        user: "value",
      },
      documentProperties: {
        document: "value",
      },
    });

    expect(await store.getAll(script)).toStrictEqual({
      script: "value",
    });
    expect(await store.getAll(user)).toStrictEqual({
      user: "value",
    });
    expect(await store.getAll(document)).toStrictEqual({
      document: "value",
    });
  });

  test("ignore document property data without document context", async () => {
    const store = new InMemoryPropertiesStore();
    const scope: InvocationScope = {
      scriptKey: "script-a",
      userKey: "user-a",
    };

    await applyPropertiesRuntimeData(store, scope, {
      documentProperties: {
        document: "value",
      },
    });

    expect(resolvePropertiesNamespace(scope, "document")).toBeUndefined();
  });
});
