import { describe, expect, test } from "vitest";

import { WebAppSessionRegistry } from "./session-registry";

describe("WebAppSessionRegistry", () => {
  test("issue session id", () => {
    const registry = new WebAppSessionRegistry({
      createId: () => "session-1",
      now: () => 1000,
    });

    expect(registry.issue()).toBe("session-1");
  });

  test("retry when generated id already exists", () => {
    const ids = ["session-1", "session-1", "session-2"];

    let index = 0;

    const registry = new WebAppSessionRegistry({
      createId: () => ids[index++]!,
      now: () => 1000,
    });

    expect(registry.issue()).toBe("session-1");
    expect(registry.issue()).toBe("session-2");
  });

  test("claim and consume session", () => {
    const registry = new WebAppSessionRegistry({
      createId: () => "session-1",
      now: () => 1000,
    });

    registry.issue();

    expect(registry.claim()).toBe("session-1");
    expect(registry.consume("session-1")).toBe(true);
    expect(registry.consume("session-1")).toBe(false);
  });

  test("do not consume unclaimed session", () => {
    const registry = new WebAppSessionRegistry({
      createId: () => "session-1",
      now: () => 1000,
    });

    registry.issue();

    expect(registry.consume("session-1")).toBe(false);
    expect(registry.claim()).toBe("session-1");
  });

  test("discard expired session", () => {
    let now = 1000;

    const registry = new WebAppSessionRegistry({
      createId: () => "session-1",
      now: () => now,
      ttlMs: 30_000,
    });

    registry.issue();

    now = 31_000;

    expect(registry.claim()).toBeNull();
  });
});
