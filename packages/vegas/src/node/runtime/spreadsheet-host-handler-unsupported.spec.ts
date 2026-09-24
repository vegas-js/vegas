import { describe, expect, test } from "vitest";

import { InMemorySpreadsheetStore } from "./in-memory-spreadsheet-store";
import { SpreadsheetHostHandler } from "./spreadsheet-host-handler";
import { UnsupportedRuntimeOperationError } from "./unsupported-runtime-operation-error";

describe("SpreadsheetHostHandler unsupported operations", () => {
  test("report Spreadsheet.getUrl() as unsupported without a local URL capability", async () => {
    const handler = new SpreadsheetHostHandler(new InMemorySpreadsheetStore());
    let caught: unknown;

    try {
      await handler.handle({
        service: "spreadsheet",
        operation: "get-spreadsheet-url",
        spreadsheet: {
          service: "spreadsheet",
          kind: "spreadsheet",
          id: "spreadsheet-a",
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(UnsupportedRuntimeOperationError);
    expect(caught).toMatchObject({
      name: "UnsupportedRuntimeOperationError",
      message:
        "Local Runtime does not support Spreadsheet.getUrl(): local Spreadsheet URLs require a URL capability.",
    });
  });
});
