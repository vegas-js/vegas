import { describe, expect, test } from "vitest";

import { createUtilities } from "./utilities";

type CsvContract = Pick<GoogleAppsScript.Utilities.Utilities, "parseCsv">;

describe("Utilities.parseCsv", () => {
  test("parse comma-separated multiline data", () => {
    const utilities = createUtilities();
    const contract: CsvContract = utilities;

    expect(contract).toBe(utilities);
    expect(utilities.parseCsv("a,b,c\nd,e,f")).toStrictEqual([
      ["a", "b", "c"],
      ["d", "e", "f"],
    ]);
  });

  test("parse data using a custom delimiter", () => {
    const utilities = createUtilities();

    expect(utilities.parseCsv("a\tb\tc\nd\te\tf", "\t")).toStrictEqual([
      ["a", "b", "c"],
      ["d", "e", "f"],
    ]);
  });

  test("parse RFC 4180 quoted fields, escaped quotes, empty fields, and embedded line breaks", () => {
    const utilities = createUtilities();
    const csv = 'name,quote,note\r\nAlice,"He said ""hi""","line1\r\nline2"\r\nBob,,tail\r\n';

    expect(utilities.parseCsv(csv)).toStrictEqual([
      ["name", "quote", "note"],
      ["Alice", 'He said "hi"', "line1\r\nline2"],
      ["Bob", "", "tail"],
    ]);
  });

  test("apply CSV quoting rules with a custom delimiter", () => {
    const utilities = createUtilities();

    expect(utilities.parseCsv('a\t"b\tc"\nd\te', "\t")).toStrictEqual([
      ["a", "b\tc"],
      ["d", "e"],
    ]);
  });
});
