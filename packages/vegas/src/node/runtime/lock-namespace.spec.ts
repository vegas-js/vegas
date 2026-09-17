import { describe, expect, test } from "vitest";

import { resolveLockNamespace } from "./lock-namespace";

describe("resolveLockNamespace", () => {
  test("resolve script and user namespaces from the invocation scope", () => {
    const scope = {
      scriptKey: "script-a",
      userKey: "user-a",
      documentKey: "document-a",
    };

    expect(resolveLockNamespace(scope, "script")).toStrictEqual({
      kind: "script",
      scriptKey: "script-a",
    });
    expect(resolveLockNamespace(scope, "user")).toStrictEqual({
      kind: "user",
      scriptKey: "script-a",
      userKey: "user-a",
    });
  });

  test("resolve document namespace only when a containing document exists", () => {
    expect(
      resolveLockNamespace(
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
      resolveLockNamespace(
        {
          scriptKey: "script-a",
          userKey: "user-a",
        },
        "document",
      ),
    ).toBeUndefined();
  });
});
