import { expect, test } from "vitest";

import type { ServiceCaller } from "../runtime/protocol";
import { createRangeService } from "./remoteServices";

test("forwards Range.getValue", () => {
  const calls: unknown[][] = [];
  const callService = ((service, method, ...args) => {
    calls.push([service, method, ...args]);
    return "value";
  }) as ServiceCaller;
  const service = createRangeService(callService);
  const payload = {
    spreadsheetId: "spreadsheet-1",
    sheetId: 1,
    range: { row: 1, column: 1 },
  };

  expect(service.getValue(payload)).toBe("value");
  expect(calls).toEqual([["Range", "getValue", payload]]);
});
