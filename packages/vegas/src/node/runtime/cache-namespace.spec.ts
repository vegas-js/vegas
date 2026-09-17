import { describe, expect, test } from "vitest";

import { resolveCacheNamespace } from "./cache-namespace";

describe("resolveCacheNamespace", () => {
  test("resolve script and user namespaces from the invocation scope", () => {
    const scope = {
      scriptKey: "script-a",
      userKey: "user-a",
      documentKey: "document-a",
    };

    expect(resolveCacheNamespace(scope, "script")).toStrictEqual({
      kind: "script",
      scriptKey: "script-a",
    });
    expect(resolveCacheNamespace(scope, "user")).toStrictEqual({
      kind: "user",
      scriptKey: "script-a",
      userKey: "user-a",
    });
  });

  test("resolve document namespace only when a containing document exists", () => {
    expect(
      resolveCacheNamespace(
        {
          scriptKey: "script-a",
          userKey: "user-a",
          documentKey: "document-a",
        },
        "document",
      ),
    ).toStrictEqual({
      kind: "document",
      scriptKey: "script-a",
      documentKey: "document-a",
    });

    expect(
      resolveCacheNamespace(
        {
          scriptKey: "script-a",
          userKey: "user-a",
        },
        "document",
      ),
    ).toBeUndefined();
  });
});
