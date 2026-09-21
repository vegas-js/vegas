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

function editableCellType(value: SpreadsheetCellValue): "string" | "number" | "boolean" | null {
  if (typeof value === "string") {
    return "string";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  return null;
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
  const type = editableCellType(value);

  if (type === null) {
    return `<td class="readonly" title="Date cells are read-only in the local viewer.">${content}</td>`;
  }

  return `<td data-cell data-row="${row}" data-column="${column}" data-value-type="${type}" tabindex="0">${content}</td>`;
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

function createCellEditor(): string {
  return `<dialog id="cell-editor">
    <form id="cell-editor-form">
      <h2>Edit cell</h2>
      <label>Type
        <select id="cell-type">
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
        </select>
      </label>
      <label id="string-field">Value
        <textarea id="string-value" rows="4"></textarea>
      </label>
      <label id="number-field" hidden>Value
        <input id="number-value" type="number" step="any">
      </label>
      <label id="boolean-field" hidden>Value
        <select id="boolean-value">
          <option value="true">TRUE</option>
          <option value="false">FALSE</option>
        </select>
      </label>
      <p id="cell-editor-error" class="error" role="alert"></p>
      <div class="actions">
        <button id="cell-editor-cancel" type="button">Cancel</button>
        <button type="submit">Save</button>
      </div>
    </form>
  </dialog>`;
}

function createCellEditorScript(): string {
  return `<script>
(() => {
  const body = document.body;
  const dialog = document.querySelector("#cell-editor");
  const form = document.querySelector("#cell-editor-form");
  const type = document.querySelector("#cell-type");
  const stringField = document.querySelector("#string-field");
  const stringValue = document.querySelector("#string-value");
  const numberField = document.querySelector("#number-field");
  const numberValue = document.querySelector("#number-value");
  const booleanField = document.querySelector("#boolean-field");
  const booleanValue = document.querySelector("#boolean-value");
  const cancel = document.querySelector("#cell-editor-cancel");
  const error = document.querySelector("#cell-editor-error");
  let cell = null;

  const setType = (valueType) => {
    stringField.hidden = valueType !== "string";
    numberField.hidden = valueType !== "number";
    booleanField.hidden = valueType !== "boolean";
  };

  const openCell = (target) => {
    cell = target;
    const valueType = target.dataset.valueType;
    const text = target.textContent ?? "";

    type.value = valueType;
    stringValue.value = text;
    numberValue.value = Number.isFinite(Number(text)) ? text : "";
    booleanValue.value = text === "FALSE" ? "false" : "true";
    error.textContent = "";
    setType(valueType);
    dialog.showModal();
  };

  document.querySelectorAll("[data-cell]").forEach((target) => {
    target.addEventListener("dblclick", () => openCell(target));
    target.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        openCell(target);
      }
    });
  });

  type.addEventListener("change", () => setType(type.value));
  cancel.addEventListener("click", () => dialog.close());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (cell === null) {
      return;
    }

    let value;

    if (type.value === "number") {
      if (numberValue.value.trim() === "") {
        error.textContent = "Enter a number.";
        return;
      }

      value = Number(numberValue.value);
      if (!Number.isFinite(value)) {
        error.textContent = "Enter a finite number.";
        return;
      }
    } else if (type.value === "boolean") {
      value = booleanValue.value === "true";
    } else {
      value = stringValue.value;
    }

    error.textContent = "";

    try {
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

      window.location.reload();
    } catch (cause) {
      error.textContent = cause instanceof Error ? cause.message : String(cause);
    }
  });
})();
</script>`;
}

export function createLocalSpreadsheetHtml(page: LocalSpreadsheetPage): string {
  const activeSheet =
    page.activeSheet === null
      ? ""
      : `<section><h2>${escapeHtml(page.activeSheet.name)}</h2><p class="hint">Double-click a cell or press Enter to edit.</p>${createGrid(page.activeSheet.values)}</section>`;
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
    h2 { margin: 18px 24px 6px; font-size: 16px; }
    .tabs { display: flex; gap: 4px; padding: 10px 24px 0; overflow-x: auto; }
    .tabs a { padding: 8px 12px; color: inherit; text-decoration: none; border: 1px solid transparent; border-radius: 6px 6px 0 0; white-space: nowrap; }
    .tabs a[aria-current="page"] { border-color: color-mix(in srgb, CanvasText 24%, transparent); border-bottom-color: Canvas; font-weight: 600; }
    .hint { margin: 0 24px 12px; opacity: .65; font-size: 12px; }
    .grid { overflow: auto; margin: 0 24px 24px; border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); }
    table { border-collapse: collapse; min-width: 100%; font-size: 13px; }
    th, td { min-width: 96px; height: 28px; padding: 4px 8px; border: 1px solid color-mix(in srgb, CanvasText 14%, transparent); text-align: left; white-space: pre-wrap; }
    thead th, tbody th { min-width: 42px; background: color-mix(in srgb, CanvasText 6%, Canvas); text-align: center; font-weight: 500; }
    td[data-cell] { cursor: pointer; }
    td[data-cell]:focus { outline: 2px solid Highlight; outline-offset: -2px; }
    td.readonly { opacity: .75; }
    .corner { min-width: 42px; }
    .empty { margin: 20px 24px; opacity: .7; }
    dialog { width: min(420px, calc(100vw - 32px)); border: 1px solid color-mix(in srgb, CanvasText 24%, transparent); border-radius: 8px; padding: 0; background: Canvas; color: CanvasText; }
    dialog::backdrop { background: rgb(0 0 0 / 35%); }
    dialog form { display: grid; gap: 14px; padding: 20px; }
    dialog h2 { margin: 0; }
    dialog label { display: grid; gap: 6px; font-size: 13px; }
    dialog input, dialog select, dialog textarea, dialog button { font: inherit; }
    dialog input, dialog select, dialog textarea { box-sizing: border-box; width: 100%; padding: 8px; }
    dialog textarea { resize: vertical; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
    .actions button { padding: 7px 12px; }
    .error { min-height: 1.2em; margin: 0; color: #c62828; font-size: 12px; }
  </style>
</head>
<body data-spreadsheet-api="${escapeHtml(spreadsheetApi)}" data-sheet-id="${sheetId}">
  <header><h1>${escapeHtml(page.name)}</h1></header>
  ${createSheetTabs(page)}
  ${activeSheet}
  ${createCellEditor()}
  ${createCellEditorScript()}
</body>
</html>`;
}
