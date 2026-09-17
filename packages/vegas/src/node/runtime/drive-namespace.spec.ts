import { describe, expect, test } from "vitest";

import { resolveDriveNamespace, type InvocationScope } from "./index";

describe("resolveDriveNamespace", () => {
  test("route Drive by user independently from script and document identity", () => {
    const first: InvocationScope = {
      scriptKey: "script-a",
      userKey: "user-a",
      documentKey: "document-a",
    };
    const second: InvocationScope = {
      scriptKey: "script-b",
      userKey: "user-a",
    };

    expect(resolveDriveNamespace(first)).toStrictEqual({ userKey: "user-a" });
    expect(resolveDriveNamespace(second)).toStrictEqual(resolveDriveNamespace(first));
    expect(resolveDriveNamespace({ scriptKey: "script-a", userKey: "user-b" })).not.toStrictEqual(
      resolveDriveNamespace(first),
    );
  });
});
