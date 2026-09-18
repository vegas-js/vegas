import { describe, expect, test } from "vitest";

import { createNodeUtilities } from "./node";

type DateContract = Pick<GoogleAppsScript.Utilities.Utilities, "formatDate" | "parseDate">;

describe("Utilities date formatting", () => {
  test("match the documented GMT format and parse examples", () => {
    const utilities = createNodeUtilities();
    const contract: DateContract = utilities;

    expect(contract).toBe(utilities);
    expect(utilities.formatDate(new Date(0), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'")).toBe(
      "1970-01-01T00:00:00Z",
    );
    expect(
      utilities.parseDate("1970-01-01 00:00:00", "GMT", "yyyy-MM-dd' 'HH:mm:ss").getTime(),
    ).toBe(0);
  });

  test("apply IANA time zones and RFC 822 / ISO 8601 offsets", () => {
    const utilities = createNodeUtilities();

    expect(utilities.formatDate(new Date(0), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss Z XXX")).toBe(
      "1970-01-01 09:00:00 +0900 +09:00",
    );
    expect(
      utilities.parseDate("1970-01-01 09:00:00", "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss").getTime(),
    ).toBe(0);
    expect(
      utilities.parseDate("1970-01-01 09:00:00 +0900", "GMT", "yyyy-MM-dd HH:mm:ss Z").getTime(),
    ).toBe(0);
    expect(
      utilities.parseDate("1970-01-01T09:00:00+09:00", "GMT", "yyyy-MM-dd'T'HH:mm:ssXXX").getTime(),
    ).toBe(0);
    expect(utilities.formatDate(new Date(0), "GMT+05:30", "X XX XXX")).toBe("+05 +0530 +05:30");
  });

  test("respect daylight-saving offsets for IANA time zones", () => {
    const utilities = createNodeUtilities();

    expect(
      utilities.formatDate(
        new Date("2026-07-01T12:34:56.789Z"),
        "America/New_York",
        "yyyy-MM-dd HH:mm:ss.SSS Z",
      ),
    ).toBe("2026-07-01 08:34:56.789 -0400");
    expect(
      utilities.formatDate(
        new Date("2026-01-01T12:34:56.789Z"),
        "America/New_York",
        "yyyy-MM-dd HH:mm:ss.SSS Z",
      ),
    ).toBe("2026-01-01 07:34:56.789 -0500");
  });

  test("ignore numeric pattern width during separated-field parsing", () => {
    const utilities = createNodeUtilities();

    expect(utilities.parseDate("1/2/2024", "GMT", "MM/dd/yyyy").getTime()).toBe(
      Date.UTC(2024, 0, 2),
    );
    expect(utilities.parseDate("20240102", "GMT", "yyyyMMdd").getTime()).toBe(Date.UTC(2024, 0, 2));
  });

  test("support quoted literals, day-of-year, and ISO weekday numbers", () => {
    const utilities = createNodeUtilities();
    const date = new Date("2024-12-31T23:05:07.009Z");

    expect(utilities.formatDate(date, "GMT", "yyyy DDD u 'at' HH:mm:ss.SSS ''")).toBe(
      "2024 366 2 at 23:05:07.009 '",
    );
    expect(
      utilities.parseDate("2024-366 23:05:07.009", "GMT", "yyyy-DDD HH:mm:ss.SSS").getTime(),
    ).toBe(date.getTime());
  });

  test("reject locale or calendar dependent patterns until Runtime locale semantics exist", () => {
    const utilities = createNodeUtilities();

    expect(() => utilities.formatDate(new Date(0), "GMT", "MMM d, yyyy")).toThrow();
    expect(() => utilities.formatDate(new Date(0), "GMT", "EEE")).toThrow();
    expect(() => utilities.formatDate(new Date(0), "GMT", "h:mm a")).toThrow();
    expect(() => utilities.formatDate(new Date(0), "GMT", "yyyy z")).toThrow();
    expect(() => utilities.formatDate(new Date(0), "GMT", "YYYY-'W'ww-u")).toThrow();
    expect(() => utilities.formatDate(new Date(0), "GMT", "XXXX")).toThrow();
    expect(() => utilities.parseDate("2024-12-31 2", "GMT", "yyyy-MM-dd u")).toThrow();
  });
});
