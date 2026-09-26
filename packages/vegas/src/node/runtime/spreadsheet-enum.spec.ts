import { describe, expect, test } from "vitest";

import type { HostBridge } from "./host-bridge";
import type { HostCall, HostCallResult } from "./host-call";
import { createSpreadsheetApp } from "./spreadsheet-object-hydrator";

const unusedBridge: HostBridge = {
  call<C extends HostCall>(call: C): HostCallResult<C> {
    throw new Error(`unexpected HostBridge call: ${call.service}#${call.operation}`);
  },
};

describe("SpreadsheetApp enums", () => {
  test("expose documented formatting enum surfaces", () => {
    const spreadsheetApp = createSpreadsheetApp(unusedBridge);

    expect(spreadsheetApp.BorderStyle).toStrictEqual({
      DOTTED: "DOTTED",
      DASHED: "DASHED",
      SOLID: "SOLID",
      SOLID_MEDIUM: "SOLID_MEDIUM",
      SOLID_THICK: "SOLID_THICK",
      DOUBLE: "DOUBLE",
    });
    expect(spreadsheetApp.TextDirection).toStrictEqual({
      LEFT_TO_RIGHT: "LEFT_TO_RIGHT",
      RIGHT_TO_LEFT: "RIGHT_TO_LEFT",
    });
    expect(spreadsheetApp.WrapStrategy).toStrictEqual({
      WRAP: "WRAP",
      OVERFLOW: "OVERFLOW",
      CLIP: "CLIP",
    });
  });
});
