import { describe, expect, test } from "vitest";

import { User } from "./index";

// https://developers.google.com/apps-script/reference/base/user
describe("User Runtime object", () => {
  test("preserve email values including an unavailable email", () => {
    expect(new User("active@example.com").getEmail()).toBe("active@example.com");
    expect(new User("").getEmail()).toBe("");
  });

  test("support the documented deprecated login alias", () => {
    const user = new User("active@example.com");

    expect(user.getUserLoginId()).toBe(user.getEmail());
  });
});
