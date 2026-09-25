import { describe, expect, test } from "vitest";

import type { HostBridge } from "./host-bridge";
import { SpreadsheetApp } from "./spreadsheet-app";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";

describe("SpreadsheetApp.Direction", () => {
  test("expose the documented Direction runtime enum", () => {
    const spreadsheetApp = new SpreadsheetApp({} as HostBridge, {} as SpreadsheetObjectHydrator);

    expect(spreadsheetApp.Direction).toStrictEqual({
      UP: "UP",
      DOWN: "DOWN",
      PREVIOUS: "PREVIOUS",
      NEXT: "NEXT",
    });
    expect(JSON.stringify(spreadsheetApp.Direction.UP)).toBe('"UP"');
    expect(JSON.stringify(spreadsheetApp.Direction.DOWN)).toBe('"DOWN"');
    expect(JSON.stringify(spreadsheetApp.Direction.PREVIOUS)).toBe('"PREVIOUS"');
    expect(JSON.stringify(spreadsheetApp.Direction.NEXT)).toBe('"NEXT"');
  });
});
