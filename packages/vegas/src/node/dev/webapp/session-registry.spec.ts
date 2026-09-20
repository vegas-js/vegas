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

  test("reuse an expired session id when issuing a new session", () => {
    const ids = ["session-1", "session-1", "session-2"];
    let index = 0;
    let now = 1000;

    const registry = new WebAppSessionRegistry({
      createId: () => ids[index++]!,
      now: () => now,
      ttlMs: 30_000,
    });

    expect(registry.issue()).toBe("session-1");

    now = 31_000;

    expect(registry.issue()).toBe("session-1");
  });

  test("claim and consume session", () => {
    const registry = new WebAppSessionRegistry({
      createId: () => "session-1",
      now: () => 1000,
    });

    registry.issue();

    expect(registry.claim("session-1")).toBe(true);
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
    expect(registry.claim("session-1")).toBe(true);
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

    expect(registry.claim("session-1")).toBe(false);
  });

  test("claim specific session", () => {
    const ids = ["session-1", "session-2"];

    let index = 0;
    const registry = new WebAppSessionRegistry({
      createId: () => ids[index++]!,
      now: () => 1000,
    });

    const first = registry.issue();
    const second = registry.issue();

    expect(first).toBe("session-1");
    expect(second).toBe("session-2");

    expect(registry.claim(second)).toBe(true);
    expect(registry.consume(second)).toBe(true);
    expect(registry.claim(first)).toBe(true);
  });
});
