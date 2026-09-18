import { describe, expect, test } from "vitest";

import { createNodeUtilities } from "./node";

type FormatStringContract = Pick<GoogleAppsScript.Utilities.Utilities, "formatString">;

describe("Utilities.formatString", () => {
  test("match the documented width and floating-point precision examples", () => {
    const utilities = createNodeUtilities();
    const contract: FormatStringContract = utilities;

    expect(contract).toBe(utilities);
    expect(utilities.formatString("%11.6f", 123.456)).toBe(" 123.456000");
    expect(utilities.formatString("%6s", "abc")).toBe("   abc");
  });

  test("format the locale-independent Vegas printf subset", () => {
    const utilities = createNodeUtilities();

    expect(utilities.formatString("id=%04d hex=%#06x str=%-5.3s %%", 42, 42, "abcdef")).toBe(
      "id=0042 hex=0x002a str=abc   %",
    );
    expect(utilities.formatString("%+.2e", 1234)).toBe("+1.23e+03");
    expect(utilities.formatString("%#5o", 8)).toBe("  010");
    expect(utilities.formatString("%3c", 65)).toBe("  A");
  });

  test("apply integer precision before field width", () => {
    const utilities = createNodeUtilities();

    expect(utilities.formatString("%.4d", 42)).toBe("0042");
    expect(utilities.formatString("%08.4d", 42)).toBe("    0042");
  });

  test("ignore extra arguments and reject unsupported or incomplete formats", () => {
    const utilities = createNodeUtilities();

    expect(utilities.formatString("%s", "abc", "unused")).toBe("abc");
    expect(() => utilities.formatString("%*s", 6, "abc")).toThrow();
    expect(() => utilities.formatString("%2$s", "a", "b")).toThrow();
    expect(() => utilities.formatString("%,d", 1234)).toThrow();
    expect(() => utilities.formatString("%u", 1)).toThrow();
    expect(() => utilities.formatString("%s")).toThrow();
  });
});
