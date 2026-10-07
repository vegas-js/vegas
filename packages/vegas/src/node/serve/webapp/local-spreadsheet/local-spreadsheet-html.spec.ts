import { describe, expect, test } from "vitest";

import { createLocalSpreadsheetHtml } from "./local-spreadsheet-html";

describe("createLocalSpreadsheetHtml", () => {
  test("render sheet tabs, inline-editable cells, and escaped values", () => {
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
    expect(html).toContain('data-spreadsheet-api="/__vegas/api/spreadsheets/budget%3A2026"');
    expect(html).toContain('data-sheet-id="7"');
    expect(html).toContain('aria-current="page"');
    expect(html.match(/>Summary</g)).toHaveLength(1);
    expect(html).toContain('<th scope="col">A</th>');
    expect(html).toContain('<th scope="col">C</th>');
    expect(html).toContain('<th scope="row">2</th>');
    expect(html).toContain('data-row="1" data-column="1" tabindex="0"');
    expect(html).toContain('data-row="2" data-column="2" tabindex="0"');
    expect(html).toContain("Vegas &lt;script&gt;");
    expect(html).toContain(">TRUE<");
    expect(html).toContain(
      '<td class="readonly" title="Date cells are read-only in the local viewer.">2026-09-21T00:00:00.000Z</td>',
    );
    expect(html).toContain('id="cell-status"');
    expect(html).toContain("width: 112px; min-width: 112px; max-width: 112px;");
    expect(html).toContain("width: 48px; min-width: 48px; max-width: 48px;");
    expect(html).toContain('input.className = "cell-input"');
    expect(html).toContain('event.key === "ArrowDown"');
    expect(html).toContain('event.key === "Delete"');
    expect(html).toContain("void finish(true, 0, 0, false);");
    expect(html).toContain('text.startsWith("\'")');
    expect(html).toContain('method: "PATCH"');
    expect(html).not.toContain('id="cell-editor"');
    expect(html).not.toContain("window.location.reload()");
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
