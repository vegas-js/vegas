import { describe, expect, test } from "vitest";

import { validateAuthProfileOption } from "./auth-profile-option";
import { CliUsageError } from "./error";

describe("validateAuthProfileOption", () => {
  test("accept undefined profile", () => {
    expect(() => validateAuthProfileOption(undefined)).not.toThrow();
  });

  test("accept profile", () => {
    expect(() => validateAuthProfileOption("work")).not.toThrow();
  });

  test("reject empty profile", () => {
    expect(() => validateAuthProfileOption("")).toThrow(CliUsageError);
    expect(() => validateAuthProfileOption("")).toThrow(
      "Apps Script auth profile must not be empty.",
    );
  });

  test("reject whitespace-only profile", () => {
    expect(() => validateAuthProfileOption("   ")).toThrow(
      "Apps Script auth profile must not be empty.",
    );
  });
});
