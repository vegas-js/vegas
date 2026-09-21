import { describe, expect, test } from "vitest";

import { InMemorySpreadsheetStore } from "./in-memory-spreadsheet-store";
import { SpreadsheetHostHandler } from "./spreadsheet-host-handler";
import type { SpreadsheetReference } from "./spreadsheet-reference";
import type { SpreadsheetUrlCapability } from "./spreadsheet-url-capability";

const spreadsheet = {
  service: "spreadsheet",
  kind: "spreadsheet",
  id: "spreadsheet-a",
} satisfies SpreadsheetReference;

const urls: SpreadsheetUrlCapability = {
  getSpreadsheetUrl(reference) {
    return `http://localhost:62000/__vegas/spreadsheets/${encodeURIComponent(reference.id)}`;
  },
  getSpreadsheetIdByUrl(value) {
    const url = new URL(value);

    if (
      url.origin !== "http://localhost:62000" ||
      !url.pathname.startsWith("/__vegas/spreadsheets/")
    ) {
      return undefined;
    }

    return decodeURIComponent(url.pathname.slice("/__vegas/spreadsheets/".length));
  },
};

describe("Spreadsheet URL host behavior", () => {
  test("round-trip getUrl output through openByUrl resolution", async () => {
    const handler = new SpreadsheetHostHandler(
      new InMemorySpreadsheetStore([
        {
          id: "spreadsheet-a",
          name: "Budget",
          sheets: [],
        },
      ]),
      urls,
    );
    const url = "http://localhost:62000/__vegas/spreadsheets/spreadsheet-a";

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-spreadsheet-url",
        spreadsheet,
      }),
    ).resolves.toBe(url);

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-spreadsheet-by-url",
        url,
      }),
    ).resolves.toStrictEqual(spreadsheet);
  });

  test("keep configured and Google URL aliases delegated to the Spreadsheet store", async () => {
    const handler = new SpreadsheetHostHandler(
      new InMemorySpreadsheetStore([
        {
          id: "spreadsheet-a",
          url: "https://example.test/budget",
          name: "Budget",
          sheets: [],
        },
      ]),
      urls,
    );

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-spreadsheet-by-url",
        url: "https://example.test/budget",
      }),
    ).resolves.toStrictEqual(spreadsheet);

    await expect(
      handler.handle({
        service: "spreadsheet",
        operation: "get-spreadsheet-by-url",
        url: "https://docs.google.com/spreadsheets/d/spreadsheet-a/edit",
      }),
    ).resolves.toStrictEqual(spreadsheet);
  });
});
