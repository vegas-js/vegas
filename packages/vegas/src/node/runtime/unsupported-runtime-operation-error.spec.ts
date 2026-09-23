import { describe, expect, test } from "vitest";

import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

describe("UnsupportedRuntimeOperationError", () => {
  test("identify intentional Local Runtime limitations", () => {
    const error = new UnsupportedRuntimeOperationError(
      "Example.operation()",
      "the required host capability is unavailable.",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("UnsupportedRuntimeOperationError");
    expect(error.message).toBe(
      "Local Runtime does not support Example.operation(): the required host capability is unavailable.",
    );
  });
});
