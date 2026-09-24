import { describe, expect, test } from "vitest";

import {
  isRuntimeErrorSnapshot,
  restoreRuntimeError,
  serializeRuntimeError,
} from "./runtime-error";
import { RuntimeInfrastructureError } from "./runtime-infrastructure-error";

describe("Runtime infrastructure error transport", () => {
  test("validate infrastructure metadata", () => {
    expect(
      isRuntimeErrorSnapshot({
        name: "RuntimeInfrastructureError",
        message: "failed",
        infrastructureKind: "serialization",
      }),
    ).toBe(true);
    expect(
      isRuntimeErrorSnapshot({
        name: "RuntimeInfrastructureError",
        message: "failed",
        infrastructureKind: "unknown",
      }),
    ).toBe(false);
  });

  test("preserve the infrastructure failure kind across the runtime error transport", () => {
    const snapshot = serializeRuntimeError(
      new RuntimeInfrastructureError("serialization", "could not serialize"),
    );

    expect(snapshot).toMatchObject({
      name: "RuntimeInfrastructureError",
      message: "could not serialize",
      infrastructureKind: "serialization",
    });

    const restored = restoreRuntimeError(snapshot);

    expect(restored).toBeInstanceOf(RuntimeInfrastructureError);
    expect(restored).toMatchObject({
      name: "RuntimeInfrastructureError",
      message: "could not serialize",
      kind: "serialization",
    });
  });
});
