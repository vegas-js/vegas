import { describe, expect, test } from "vitest";

import { createLocalSpreadsheetHtml } from "./local-spreadsheet-html";

describe("createLocalSpreadsheetHtml", () => {
  test("render sheet tabs, column labels, row labels, and escaped values", () => {
    const html = createLocalSpreadsheetHtml({
      id: "budget:2026",
      name: 'Budget <"2026">',
      sheets: [
        { id: 7, name: "Summary" },
        { id: 9, name: "Archive" },
      ],
      activeSheet: {
        id: 7,
        name: "Summary",
        values: [
          ["Name", "Amount", true],
          ["Vegas <script>", 42, new Date("2026-09-21T00:00:00.000Z")],
        ],
      },
    });

    expect(html).toContain(
      "<title>Budget &lt;&quot;2026&quot;&gt; · Vegas Local Spreadsheet</title>",
    );
    expect(html).toContain("/__vegas/spreadsheets/budget%3A2026?sheet=7");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('<th scope="col">A</th>');
    expect(html).toContain('<th scope="col">C</th>');
    expect(html).toContain('<th scope="row">2</th>');
    expect(html).toContain("Vegas &lt;script&gt;");
    expect(html).toContain(">TRUE<");
    expect(html).toContain("2026-09-21T00:00:00.000Z");
  });

  test("render empty Spreadsheet and Sheet states", () => {
    expect(
      createLocalSpreadsheetHtml({
        id: "empty",
        name: "Empty",
        sheets: [],
        activeSheet: null,
      }),
    ).toContain("No sheets are available.");

    expect(
      createLocalSpreadsheetHtml({
        id: "empty-sheet",
        name: "Empty",
        sheets: [{ id: 1, name: "Sheet1" }],
        activeSheet: {
          id: 1,
          name: "Sheet1",
          values: [],
        },
      }),
    ).toContain("This sheet has no cell values.");
  });
});
