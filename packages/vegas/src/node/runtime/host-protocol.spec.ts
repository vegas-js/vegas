import { describe, expect, test, vi } from "vitest";

import { isHostRequestEnvelope, parseHostRequestEnvelope } from "./host-protocol";

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

  test("reject inherited envelope fields without executing getters", () => {
    const call = { service: "properties", operation: "get" };
    const inheritedId = Object.assign(Object.create({ id: 1 }) as Record<string, unknown>, {
      call,
    });
    expect(isHostRequestEnvelope(inheritedId)).toBe(false);

    const inheritedCall = Object.assign(Object.create({ call }) as Record<string, unknown>, {
      id: 1,
    });
    expect(isHostRequestEnvelope(inheritedCall)).toBe(false);

    for (const key of ["service", "operation"] as const) {
      const inherited = Object.assign(
        Object.create({ [key]: call[key] }) as Record<string, unknown>,
        key === "service" ? { operation: "get" } : { service: "properties" },
      );
      expect(isHostRequestEnvelope({ id: 1, call: inherited })).toBe(false);
    }

    const nullPrototypeCall = Object.assign(Object.create(null) as Record<string, unknown>, call);
    const nullPrototypeRequest = Object.assign(Object.create(null) as Record<string, unknown>, {
      id: 1,
      call: nullPrototypeCall,
    });
    expect(isHostRequestEnvelope(nullPrototypeRequest)).toBe(true);
    expect(parseHostRequestEnvelope(nullPrototypeRequest)).toStrictEqual({
      id: 1,
      call: nullPrototypeCall,
    });
  });

  test("reject accessor fields without invoking their getters", () => {
    for (const key of ["id", "call"] as const) {
      const getter = vi.fn(() => {
        throw new Error("unexpected getter");
      });
      const request = Object.defineProperty(
        { id: 1, call: { service: "properties", operation: "get" } },
        key,
        { get: getter },
      );
      expect(isHostRequestEnvelope(request)).toBe(false);
      expect(getter).not.toHaveBeenCalled();
    }

    for (const key of ["service", "operation"] as const) {
      const getter = vi.fn(() => {
        throw new Error("unexpected getter");
      });
      const call = Object.defineProperty({ service: "properties", operation: "get" }, key, {
        get: getter,
      });
      expect(isHostRequestEnvelope({ id: 1, call })).toBe(false);
      expect(getter).not.toHaveBeenCalled();
    }
  });

  test("reject revoked proxies and throwing descriptor traps", () => {
    const { proxy, revoke } = Proxy.revocable(
      { id: 1, call: { service: "properties", operation: "get" } },
      {},
    );
    revoke();
    expect(isHostRequestEnvelope(proxy)).toBe(false);

    const throwing = new Proxy(
      { id: 1, call: { service: "properties", operation: "get" } },
      {
        getOwnPropertyDescriptor() {
          throw new Error("invalid trap");
        },
      },
    );
    expect(isHostRequestEnvelope(throwing)).toBe(false);
  });
});
