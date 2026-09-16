import { describe, expect, test } from "vitest";

import { ConfigValidationError } from "../project/validate-config";
import { formatCliError } from "./error";

describe("formatCliError", () => {
  test("format config validation error", () => {
    const error = new ConfigValidationError('unknown option "appTyp".');

    expect(formatCliError(error)).toBe('Invalid Vegas config: unknown option "appTyp".');
  });

  test("do not format unexpected error", () => {
    expect(formatCliError(new Error("unexpected"))).toBeUndefined();
  });

  test("do not format non-error value", () => {
    expect(formatCliError("failure")).toBeUndefined();
  });
});
