import { describe, expect, test } from "vitest";

import { validatePackageName } from "./package-name";

describe("validatePackageName", () => {
  test.each(["my-app", "my.app", "my_app", "123-app", "@example/my-app"])(
    "accept valid package name: %s",
    (name) => {
      expect(validatePackageName(name)).toBeUndefined();
    },
  );

  test.each(["", ".", "..", "My-App", "my app", "my!", "node_modules", "http", "@scope"])(
    "reject invalid package name: %s",
    (name) => {
      expect(validatePackageName(name)).toBe("Invalid package.json name");
    },
  );

  test("reject undefined package name", () => {
    expect(validatePackageName(undefined)).toBe("Invalid package.json name");
  });
});
