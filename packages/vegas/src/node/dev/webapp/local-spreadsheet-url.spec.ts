import { describe, expect, test } from "vitest";

import type { SpreadsheetReference } from "../../runtime/spreadsheet-reference";
import { LocalSpreadsheetUrlResolver } from "./local-spreadsheet-url";

const spreadsheet = {
  service: "spreadsheet",
  kind: "spreadsheet",
  id: "budget:2026",
} satisfies SpreadsheetReference;

describe("LocalSpreadsheetUrlResolver", () => {
  test("round-trip a local Spreadsheet viewer URL", () => {
    const urls = new LocalSpreadsheetUrlResolver();
    urls.setOrigin("http://localhost:62000/dev");

    const url = urls.getSpreadsheetUrl(spreadsheet);

    expect(url).toBe("http://localhost:62000/__vegas/spreadsheets/budget%3A2026");
    expect(urls.getSpreadsheetIdByUrl(url)).toBe("budget:2026");
    expect(urls.getSpreadsheetIdByUrl(`${url}?sheet=7`)).toBe("budget:2026");
    expect(
      urls.getSpreadsheetIdByUrl("http://localhost:63000/__vegas/spreadsheets/budget%3A2026"),
    ).toBeUndefined();
  });

  test("require the local viewer origin before URL resolution", () => {
    const urls = new LocalSpreadsheetUrlResolver();

    expect(() => urls.getSpreadsheetUrl(spreadsheet)).toThrow(
      "Local Spreadsheet viewer origin is not configured.",
    );
    expect(
      urls.getSpreadsheetIdByUrl("http://localhost:62000/__vegas/spreadsheets/budget%3A2026"),
    ).toBeUndefined();
  });
});
