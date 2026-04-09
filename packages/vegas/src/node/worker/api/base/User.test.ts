import { describe, expect, test } from "vitest";

import { User } from "./User";

describe("getEmail", () => {
  test("return the value passed in the constructor", () => {
    const user = new User("test@example.com");
    const email = user.getEmail();
    expect(email).toBe("test@example.com");
  });
});

describe("getUserLoginId", () => {
  test("always throw an exception with message", () => {
    const user = new User("test@example.com");
    expect(() => user.getUserLoginId()).toThrow("User#getUserLoginId() is deprecated. Do not use.");
  });
});
