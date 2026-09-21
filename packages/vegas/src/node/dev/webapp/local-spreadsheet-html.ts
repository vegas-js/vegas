import type { SpreadsheetCellValue, SpreadsheetGrid } from "../../runtime";

export interface LocalSpreadsheetSheetSummary {
  readonly id: number;
  readonly name: string;
}

export interface LocalSpreadsheetSheetPage {
  readonly id: number;
  readonly name: string;
  readonly values: SpreadsheetGrid;
}

export interface LocalSpreadsheetPage {
  readonly id: string;
  readonly name: string;
  readonly sheets: readonly LocalSpreadsheetSheetSummary[];
  readonly activeSheet: LocalSpreadsheetSheetPage | null;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function formatCellValue(value: SpreadsheetCellValue): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  return String(value);
}

function columnLabel(column: number): string {
  let value = column;
  let label = "";

  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }

  return label;
}

function createSheetTabs(page: LocalSpreadsheetPage): string {
  if (page.sheets.length === 0) {
    return '<p class="empty">No sheets are available.</p>';
  }

  const spreadsheetPath = `/__vegas/spreadsheets/${encodeURIComponent(page.id)}`;

  return `<nav class="tabs">${page.sheets
    .map(({ id, name }) => {
      const active = page.activeSheet?.id === id ? ' aria-current="page"' : "";
      return `<a href="${spreadsheetPath}?sheet=${id}"${active}>${escapeHtml(name)}</a>`;
    })
    .join("")}</nav>`;
}

function createGrid(values: SpreadsheetGrid): string {
  if (values.length === 0) {
    return '<p class="empty">This sheet has no cell values.</p>';
  }

  const columnCount = values[0]?.length ?? 0;
  const headers = Array.from(
    { length: columnCount },
    (_, index) => `<th scope="col">${columnLabel(index + 1)}</th>`,
  ).join("");

  const rows = values
    .map(
      (row, rowIndex) =>
        `<tr><th scope="row">${rowIndex + 1}</th>${row
          .map((value) => `<td>${escapeHtml(formatCellValue(value))}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `<div class="grid"><table><thead><tr><th class="corner"></th>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function createLocalSpreadsheetHtml(page: LocalSpreadsheetPage): string {
  const activeSheet =
    page.activeSheet === null
      ? ""
      : `<section><h2>${escapeHtml(page.activeSheet.name)}</h2>${createGrid(page.activeSheet.values)}</section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.name)} · Vegas Local Spreadsheet</title>
  <style>
    :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; background: Canvas; color: CanvasText; }
    header { padding: 20px 24px 12px; border-bottom: 1px solid color-mix(in srgb, CanvasText 18%, transparent); }
    h1 { margin: 0; font-size: 20px; }
    h2 { margin: 18px 24px 12px; font-size: 16px; }
    .tabs { display: flex; gap: 4px; padding: 10px 24px 0; overflow-x: auto; }
    .tabs a { padding: 8px 12px; color: inherit; text-decoration: none; border: 1px solid transparent; border-radius: 6px 6px 0 0; white-space: nowrap; }
    .tabs a[aria-current="page"] { border-color: color-mix(in srgb, CanvasText 24%, transparent); border-bottom-color: Canvas; font-weight: 600; }
    .grid { overflow: auto; margin: 0 24px 24px; border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); }
    table { border-collapse: collapse; min-width: 100%; font-size: 13px; }
    th, td { min-width: 96px; height: 28px; padding: 4px 8px; border: 1px solid color-mix(in srgb, CanvasText 14%, transparent); text-align: left; white-space: pre-wrap; }
    thead th, tbody th { min-width: 42px; background: color-mix(in srgb, CanvasText 6%, Canvas); text-align: center; font-weight: 500; }
    .corner { min-width: 42px; }
    .empty { margin: 20px 24px; opacity: .7; }
  </style>
</head>
<body>
  <header><h1>${escapeHtml(page.name)}</h1></header>
  ${createSheetTabs(page)}
  ${activeSheet}
</body>
</html>`;
}
