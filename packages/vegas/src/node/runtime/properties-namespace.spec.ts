import { describe, expect, test } from "vitest";

import { resolvePropertiesNamespace } from "./properties-namespace";
import type { InvocationScope } from "./scope";

const scope: InvocationScope = {
  scriptKey: "script-a",
  userKey: "user-a",
};

// https://developers.google.com/apps-script/reference/properties/properties-service
describe("resolvePropertiesNamespace", () => {
  test("resolve script and user namespaces", () => {
    expect(resolvePropertiesNamespace(scope, "script")).toStrictEqual({
      kind: "script",
      scriptKey: "script-a",
    });
    expect(resolvePropertiesNamespace(scope, "user")).toStrictEqual({
      kind: "user",
      scriptKey: "script-a",
      userKey: "user-a",
    });
  });

  test("resolve document namespace only with document context", () => {
    expect(resolvePropertiesNamespace(scope, "document")).toBeUndefined();

    expect(
      resolvePropertiesNamespace(
        {
          ...scope,
          documentKey: "document-a",
        },
        "document",
      ),
    ).toStrictEqual({
      kind: "document",
      scriptKey: "script-a",
      documentKey: "document-a",
    });
  });
});
