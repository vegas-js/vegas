import { describe, expect, test } from "vitest";

import { isTrustedMessageSource } from "./message-source";

describe("isTrustedMessageSource", () => {
  test("accept the expected origin and source together", () => {
    const { port1: source } = new MessageChannel();

    expect(
      isTrustedMessageSource(
        {
          origin: "http://localhost:5174",
          source,
        },
        "http://localhost:5174",
        source,
      ),
    ).toBe(true);
  });

  test("reject a different origin", () => {
    const { port1: source } = new MessageChannel();

    expect(
      isTrustedMessageSource(
        {
          origin: "http://localhost:5175",
          source,
        },
        "http://localhost:5174",
        source,
      ),
    ).toBe(false);
  });

  test("reject a different source", () => {
    const { port1: expectedSource, port2: source } = new MessageChannel();

    expect(
      isTrustedMessageSource(
        {
          origin: "http://localhost:5174",
          source,
        },
        "http://localhost:5174",
        expectedSource,
      ),
    ).toBe(false);
  });
});
