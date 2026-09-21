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

function createCell(value: SpreadsheetCellValue, row: number, column: number): string {
  const content = escapeHtml(formatCellValue(value));

  if (value instanceof Date) {
    return `<td class="readonly" title="Date cells are read-only in the local viewer.">${content}</td>`;
  }

  return `<td data-cell data-row="${row}" data-column="${column}" tabindex="0">${content}</td>`;
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
          .map((value, columnIndex) => createCell(value, rowIndex + 1, columnIndex + 1))
          .join("")}</tr>`,
    )
    .join("");

  return `<div class="grid"><table><thead><tr><th class="corner"></th>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function createCellEditorScript(): string {
  return `<script>
(() => {
  const body = document.body;
  const status = document.querySelector("#cell-status");
  let editingCell = null;

  const findCell = (row, column) =>
    document.querySelector('[data-cell][data-row="' + row + '"][data-column="' + column + '"]');

  const moveFocus = (cell, rowOffset, columnOffset) => {
    const next = findCell(
      Number(cell.dataset.row) + rowOffset,
      Number(cell.dataset.column) + columnOffset,
    );

    (next ?? cell).focus();
  };

  const parseCellValue = (text) => {
    if (text.startsWith("'")) {
      return text.slice(1);
    }

    const trimmed = text.trim();

    if (/^(true|false)$/i.test(trimmed)) {
      return trimmed.toLowerCase() === "true";
    }

    if (trimmed !== "") {
      const number = Number(trimmed);

      if (Number.isFinite(number)) {
        return number;
      }
    }

    return text;
  };

  const formatCellValue = (value) =>
    typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : String(value);

  const saveCell = async (cell, text) => {
    const value = parseCellValue(text);

    status.textContent = "Saving…";

    const response = await fetch(body.dataset.spreadsheetApi + "/cells", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sheetId: Number(body.dataset.sheetId),
        row: Number(cell.dataset.row),
        column: Number(cell.dataset.column),
        value,
      }),
    });

    if (!response.ok) {
      throw new Error("Cell update failed with HTTP " + response.status + ".");
    }

    cell.textContent = formatCellValue(value);
    status.textContent = "";

    return value;
  };

  const beginEdit = (cell, replacement) => {
    if (editingCell !== null) {
      return;
    }

    editingCell = cell;
    const originalText = cell.textContent ?? "";
    const input = document.createElement("input");
    let settled = false;

    input.className = "cell-input";
    input.value = replacement ?? originalText;
    cell.textContent = "";
    cell.append(input);
    input.focus();

    if (replacement === undefined) {
      input.select();
    } else {
      input.setSelectionRange(input.value.length, input.value.length);
    }

    const finish = async (commit, rowOffset = 0, columnOffset = 0) => {
      if (settled) {
        return;
      }

      settled = true;

      if (!commit) {
        cell.textContent = originalText;
        editingCell = null;
        cell.focus();
        status.textContent = "";
        return;
      }

      try {
        await saveCell(cell, input.value);
        editingCell = null;

        if (rowOffset === 0 && columnOffset === 0) {
          cell.focus();
        } else {
          moveFocus(cell, rowOffset, columnOffset);
        }
      } catch (cause) {
        settled = false;
        status.textContent = cause instanceof Error ? cause.message : String(cause);
        input.focus();
      }
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void finish(true, 1, 0);
      } else if (event.key === "Tab") {
        event.preventDefault();
        void finish(true, 0, event.shiftKey ? -1 : 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        void finish(false);
      }
    });

    input.addEventListener("blur", () => {
      void finish(true);
    });
  };

  document.querySelectorAll("[data-cell]").forEach((cell) => {
    cell.addEventListener("dblclick", () => beginEdit(cell));
    cell.addEventListener("keydown", (event) => {
      if (editingCell !== null) {
        return;
      }

      if (event.key === "Enter" || event.key === "F2") {
        event.preventDefault();
        beginEdit(cell);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        void saveCell(cell, "").catch((cause) => {
          status.textContent = cause instanceof Error ? cause.message : String(cause);
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveFocus(cell, -1, 0);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(cell, 1, 0);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveFocus(cell, 0, -1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveFocus(cell, 0, 1);
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        moveFocus(cell, 0, event.shiftKey ? -1 : 1);
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        beginEdit(cell, event.key);
      }
    });
  });
})();
</script>`;
}

export function createLocalSpreadsheetHtml(page: LocalSpreadsheetPage): string {
  const activeSheet =
    page.activeSheet === null
      ? ""
      : `<section><p class="hint">Select a cell and type to replace it. Enter or double-click to edit. Esc cancels.</p><p id="cell-status" class="status" aria-live="polite"></p>${createGrid(page.activeSheet.values)}</section>`;
  const spreadsheetApi = `/__vegas/api/spreadsheets/${encodeURIComponent(page.id)}`;
  const sheetId = page.activeSheet?.id ?? "";

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
    .tabs { display: flex; gap: 4px; padding: 10px 24px 0; overflow-x: auto; }
    .tabs a { padding: 8px 12px; color: inherit; text-decoration: none; border: 1px solid transparent; border-radius: 6px 6px 0 0; white-space: nowrap; }
    .tabs a[aria-current="page"] { border-color: color-mix(in srgb, CanvasText 24%, transparent); border-bottom-color: Canvas; font-weight: 600; }
    .hint { margin: 0 24px 4px; opacity: .65; font-size: 12px; }
    .status { min-height: 1.2em; margin: 0 24px 8px; color: #c62828; font-size: 12px; }
    .grid { overflow: auto; margin: 0 24px 24px; border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); }
    table { border-collapse: collapse; min-width: 100%; font-size: 13px; }
    th, td { box-sizing: border-box; width: 112px; min-width: 112px; max-width: 112px; height: 28px; padding: 4px 8px; border: 1px solid color-mix(in srgb, CanvasText 14%, transparent); overflow: hidden; text-align: left; white-space: pre-wrap; overflow-wrap: anywhere; }
    thead th, tbody th { width: 48px; min-width: 48px; max-width: 48px; background: color-mix(in srgb, CanvasText 6%, Canvas); text-align: center; font-weight: 500; }
    td[data-cell] { cursor: cell; }
    td[data-cell]:focus { outline: 2px solid Highlight; outline-offset: -2px; }
    td.readonly { opacity: .75; }
    .cell-input { box-sizing: border-box; width: 100%; min-width: 0; height: 100%; margin: 0; padding: 0; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; }
    .corner { min-width: 42px; }
    .empty { margin: 20px 24px; opacity: .7; }
  </style>
</head>
<body data-spreadsheet-api="${escapeHtml(spreadsheetApi)}" data-sheet-id="${sheetId}">
  <header><h1>${escapeHtml(page.name)}</h1></header>
  ${createSheetTabs(page)}
  ${activeSheet}
  ${createCellEditorScript()}
</body>
</html>`;
}
