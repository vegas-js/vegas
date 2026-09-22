import { describe, expect, test } from "vitest";

import type { TextOutputSnapshot } from "../../runtime";
import { ContentResponseRegistry } from "./content-response-registry";

const output = {
  content: '{"ok":true}',
  fileName: "vegas.json",
  mimeType: "JSON",
} satisfies TextOutputSnapshot;

describe("ContentResponseRegistry", () => {
  test("issue and consume a one-time content response", () => {
    const registry = new ContentResponseRegistry({
      createId: () => "content-1",
      now: () => 1_000,
    });

    const id = registry.issue(output);

    expect(id).toBe("content-1");
    expect(registry.consume(id)).toBe(output);
    expect(registry.consume(id)).toBeUndefined();
  });

  test("retry when a generated id is already in use", () => {
    const ids = ["content-1", "content-1", "content-2"];
    let index = 0;
    const registry = new ContentResponseRegistry({
      createId: () => ids[index++]!,
      now: () => 1_000,
    });

    expect(registry.issue(output)).toBe("content-1");
    expect(registry.issue(output)).toBe("content-2");
  });

  test("discard an expired content response", () => {
    let now = 1_000;
    const registry = new ContentResponseRegistry({
      createId: () => "content-1",
      now: () => now,
      ttlMs: 30_000,
    });

    const id = registry.issue(output);

    now = 31_000;

    expect(registry.consume(id)).toBeUndefined();
  });

  test("reuse an expired id when issuing a new response", () => {
    const ids = ["content-1", "content-1"];
    let index = 0;
    let now = 1_000;
    const registry = new ContentResponseRegistry({
      createId: () => ids[index++]!,
      now: () => now,
      ttlMs: 30_000,
    });

    expect(registry.issue(output)).toBe("content-1");

    now = 31_000;

    expect(registry.issue(output)).toBe("content-1");
  });

  test("keep responses independent by id", () => {
    const ids = ["content-1", "content-2"];
    let index = 0;
    const registry = new ContentResponseRegistry({
      createId: () => ids[index++]!,
      now: () => 1_000,
    });
    const textOutput = {
      content: "Vegas",
      fileName: null,
      mimeType: "TEXT",
    } satisfies TextOutputSnapshot;

    const jsonId = registry.issue(output);
    const textId = registry.issue(textOutput);

    expect(registry.consume(textId)).toBe(textOutput);
    expect(registry.consume(jsonId)).toBe(output);
  });
});
