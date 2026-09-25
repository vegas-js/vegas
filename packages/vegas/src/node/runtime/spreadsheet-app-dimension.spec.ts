import { describe, expect, test } from "vitest";

import type { HostBridge } from "./host-bridge";
import { SpreadsheetApp } from "./spreadsheet-app";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";

describe("SpreadsheetApp.Dimension", () => {
  test("expose the documented Dimension runtime enum", () => {
    const spreadsheetApp = new SpreadsheetApp({} as HostBridge, {} as SpreadsheetObjectHydrator);

    expect(spreadsheetApp.Dimension).toStrictEqual({
      COLUMNS: "COLUMNS",
      ROWS: "ROWS",
    });
    expect(JSON.stringify(spreadsheetApp.Dimension.COLUMNS)).toBe('"COLUMNS"');
    expect(JSON.stringify(spreadsheetApp.Dimension.ROWS)).toBe('"ROWS"');
  });
});
