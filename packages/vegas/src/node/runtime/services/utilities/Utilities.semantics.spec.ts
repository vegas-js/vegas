import { expect, test } from "vitest";

import { Utilities } from "./Utilities";

test("parseCsv() parses characterized CSV quoting semantics", () => {
  const utilities = new Utilities();

  expect(utilities.parseCsv('a,"b,c",d')).toStrictEqual([["a", "b,c", "d"]]);

  expect(utilities.parseCsv('a,"b""c",d')).toStrictEqual([["a", 'b"c', "d"]]);

  expect(utilities.parseCsv('a,"b\nc",d')).toStrictEqual([["a", "b\nc", "d"]]);

  expect(utilities.parseCsv("a,b\r\nc,d\r\n")).toStrictEqual([
    ["a", "b"],
    ["c", "d"],
  ]);

  expect(utilities.parseCsv("")).toStrictEqual([]);

  expect(utilities.parseCsv('a;"b;c";d', ";")).toStrictEqual([["a", "b;c", "d"]]);
});

test("parseCsv() rejects invalid delimiters with the characterized GAS Exception", () => {
  const utilities = new Utilities();

  try {
    utilities.parseCsv("a,b", "::");

    throw new Error("Expected parseCsv to throw");
  } catch (error) {
    expect((error as Error).name).toBe("Exception");

    expect((error as Error).message).toBe("Cannot convert '::' to char.");
  }
});

test("formatDate() matches characterized timezone and pattern semantics", () => {
  const utilities = new Utilities();

  const date = new Date(Date.UTC(2024, 1, 29, 23, 5, 6, 789));

  expect(utilities.formatDate(date, "UTC", "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")).toBe(
    "2024-02-29T23:05:06.789Z",
  );

  expect(utilities.formatDate(date, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss")).toBe(
    "2024-03-01 08:05:06",
  );

  expect(utilities.formatDate(date, "America/Los_Angeles", "yyyy-MM-dd HH:mm:ss")).toBe(
    "2024-02-29 15:05:06",
  );

  expect(utilities.formatDate(date, "Asia/Tokyo", "Z X XX XXX")).toBe("+0900 +09 +0900 +09:00");

  expect(utilities.formatDate(date, "UTC", "G Y w W F k K z")).toBe("AD 2024 9 5 5 23 11 UTC");
});

test("formatDate() falls back to UTC and rejects unsupported X widths", () => {
  const utilities = new Utilities();

  const date = new Date(Date.UTC(2024, 1, 29, 23, 5, 6, 789));

  expect(utilities.formatDate(date, "Vegas/Invalid", "yyyy-MM-dd HH:mm:ss Z")).toBe(
    "2024-02-29 23:05:06 +0000",
  );

  try {
    utilities.formatDate(date, "UTC", "XXXX");

    throw new Error("Expected formatDate to throw");
  } catch (error) {
    expect((error as Error).name).toBe("Exception");

    expect((error as Error).message).toBe("Invalid argument: XXXX");
  }
});

test("getUuid() returns characterized UUID v4 values", () => {
  const utilities = new Utilities();

  const first = utilities.getUuid();

  const second = utilities.getUuid();

  expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

  expect(first).toBe(first.toLowerCase());

  expect(first.charAt(14)).toBe("4");

  expect(first.charAt(19)).toMatch(/^[89ab]$/);

  expect(first).not.toBe(second);
});

test("sleep() returns null and rejects negative durations", () => {
  const utilities = new Utilities();

  expect(utilities.sleep(0) as unknown).toBeNull();

  try {
    utilities.sleep(-1);

    throw new Error("Expected sleep to throw");
  } catch (error) {
    expect((error as Error).name).toBe("Exception");

    expect((error as Error).message).toBe("Invalid argument");
  }
});
