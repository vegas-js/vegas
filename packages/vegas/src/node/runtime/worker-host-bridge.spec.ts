import { describe, expect, test } from "vitest";

import { readHostResponse } from "./node";

const REQUEST = {
  id: 23,
  call: {
    service: "properties",
    operation: "get",
    namespace: "script",
    key: "name",
  },
} as const;

describe("readHostResponse", () => {
  test("return the typed result for the matching request", () => {
    expect(
      readHostResponse(REQUEST, {
        id: 23,
        ok: true,
        value: "Vegas",
      }),
    ).toBe("Vegas");
  });

  test("restore host error metadata and throw it in the worker", () => {
    try {
      readHostResponse(REQUEST, {
        id: 23,
        ok: false,
        error: {
          name: "DriveError",
          type: "DriveError",
          message: "failed",
          stack: "host stack",
        },
      });
      throw new Error("expected host error");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe("DriveError");
      expect((error as Error).message).toBe("failed");
      expect((error as Error & { type: string }).type).toBe("DriveError");
      expect((error as Error).stack).toBe("host stack");
    }
  });

  test("reject missing and mismatched responses", () => {
    expect(() => readHostResponse(REQUEST, undefined)).toThrow(
      "Host response 23 is missing or invalid.",
    );
    expect(() =>
      readHostResponse(REQUEST, {
        id: 24,
        ok: true,
        value: "Vegas",
      }),
    ).toThrow("Host response id 24 does not match request 23.");
  });
});
