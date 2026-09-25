import { describe, expect, test } from "vitest";

import { isHostRequestEnvelope } from "./host-protocol";

describe("isHostRequestEnvelope", () => {
  test("validate only the host transport envelope", () => {
    expect(
      isHostRequestEnvelope({
        id: 1,
        call: {
          service: "properties",
          operation: "get",
        },
      }),
    ).toBe(true);
  });

  test("reject invalid host transport metadata", () => {
    const call = {
      service: "properties",
      operation: "get",
    };

    expect(isHostRequestEnvelope({ id: 0, call })).toBe(false);
    expect(isHostRequestEnvelope({ id: 1.5, call })).toBe(false);
    expect(isHostRequestEnvelope({ id: Number.MAX_SAFE_INTEGER + 1, call })).toBe(false);
    expect(
      isHostRequestEnvelope({
        id: 1,
        call: {
          service: "unknown",
          operation: "get",
        },
      }),
    ).toBe(false);
    expect(
      isHostRequestEnvelope({
        id: 1,
        call: {
          service: "properties",
          operation: "",
        },
      }),
    ).toBe(false);
  });
});
