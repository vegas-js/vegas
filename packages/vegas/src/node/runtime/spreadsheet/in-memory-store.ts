import { DEFAULT_LOCAL_SPREADSHEET_COLUMNS, DEFAULT_LOCAL_SPREADSHEET_ROWS } from "./defaults";
import {
  remapDeletedDimensionPositions,
  remapInsertedDimensionPositions,
  remapMovedDimensionPositions,
} from "./in-memory-dimension";
import {
  assertColumnDeletion,
  assertColumnInsertion,
  assertColumnSpan,
  assertFrozenCount,
  assertRowDeletion,
  assertRowInsertion,
  assertRowSpan,
} from "./in-memory-sheet-validation";
import {
  cloneSpreadsheetState,
  createFixtureSpreadsheetState,
  createRuntimeSpreadsheetState,
  createSheetState,
  type SheetState,
  type InMemorySpreadsheetSeed,
  type SpreadsheetState,
} from "./in-memory-state";
import type { RangeReference, SheetReference, SpreadsheetReference } from "./reference";
import type {
  SheetDataBounds,
  SheetMetadata,
  SpreadsheetGrid,
  SpreadsheetMetadata,
  SpreadsheetNoteGrid,
  SpreadsheetStore,
} from "./store";
import { assertInteger, assertPositiveInteger } from "./validation";

export type { InMemorySheetSeed, InMemorySpreadsheetSeed } from "./in-memory-state";

function cloneSpreadsheetReference(reference: SpreadsheetReference): SpreadsheetReference {
  return { ...reference };
}

function cloneSheetReference(reference: SheetReference): SheetReference {
  return { ...reference };
}

function extractGoogleSpreadsheetId(url: string): string | undefined {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  if (parsed.hostname !== "docs.google.com") {
    return undefined;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const spreadsheetsIndex = segments.indexOf("spreadsheets");
  const idMarkerIndex = segments.indexOf("d", spreadsheetsIndex + 1);

  if (spreadsheetsIndex < 0 || idMarkerIndex < 0) {
    return undefined;
  }

  return segments[idMarkerIndex + 1];
}

export class InMemorySpreadsheetStore implements SpreadsheetStore {
  readonly #spreadsheets = new Map<string, SpreadsheetState>();
  readonly #spreadsheetIdsByUrl = new Map<string, string>();
  #nextSpreadsheetId = 0;

  constructor(spreadsheets: readonly InMemorySpreadsheetSeed[] = []) {
    for (const seed of spreadsheets) {
      if (this.#spreadsheets.has(seed.id)) {
        throw new Error(`Duplicate local Spreadsheet id: ${seed.id}`);
      }

      this.#assertUrlAvailable(seed.url, seed.id);

      const state = createFixtureSpreadsheetState(seed);

      if (state.url !== undefined) {
        this.#spreadsheetIdsByUrl.set(state.url, seed.id);
      }

      this.#spreadsheets.set(seed.id, state);
    }
  }

  clone(): InMemorySpreadsheetStore {
    const clone = new InMemorySpreadsheetStore();

    for (const [id, state] of this.#spreadsheets) {
      clone.#spreadsheets.set(id, cloneSpreadsheetState(state));
    }

    for (const [url, id] of this.#spreadsheetIdsByUrl) {
      clone.#spreadsheetIdsByUrl.set(url, id);
    }

    clone.#nextSpreadsheetId = this.#nextSpreadsheetId;

    return clone;
  }

  async createSpreadsheet(
    name: string,
    rows: number,
    columns: number,
  ): Promise<SpreadsheetReference> {
    assertPositiveInteger(rows, "Spreadsheet rows");
    assertPositiveInteger(columns, "Spreadsheet columns");

    const id = this.#createSpreadsheetId();
    const state = createRuntimeSpreadsheetState(id, name, rows, columns);

    this.#spreadsheets.set(id, state);

    return cloneSpreadsheetReference(state.reference);
  }

  replaceFixtureSpreadsheet(seed: InMemorySpreadsheetSeed): void {
    const existing = this.#spreadsheets.get(seed.id);

    if (existing?.ownership === "runtime") {
      throw new Error(`Cannot replace runtime-created local Spreadsheet with fixture: ${seed.id}`);
    }

    this.#assertUrlAvailable(seed.url, seed.id);

    const next = createFixtureSpreadsheetState(seed);

    if (existing?.url !== undefined && existing.url !== next.url) {
      this.#spreadsheetIdsByUrl.delete(existing.url);
    }

    if (next.url !== undefined) {
      this.#spreadsheetIdsByUrl.set(next.url, seed.id);
    }

    this.#spreadsheets.set(seed.id, next);
  }

  removeFixtureSpreadsheet(id: string): void {
    const state = this.#getSpreadsheetState(id);

    if (state.ownership === "runtime") {
      throw new Error(`Cannot remove runtime-created local Spreadsheet as fixture: ${id}`);
    }

    if (state.url !== undefined) {
      this.#spreadsheetIdsByUrl.delete(state.url);
    }

    this.#spreadsheets.delete(id);
  }

  async getSpreadsheet(id: string): Promise<SpreadsheetReference> {
    return cloneSpreadsheetReference(this.#getSpreadsheetState(id).reference);
  }

  async getSpreadsheetByUrl(url: string): Promise<SpreadsheetReference> {
    const explicitId = this.#spreadsheetIdsByUrl.get(url);

    if (explicitId !== undefined) {
      return this.getSpreadsheet(explicitId);
    }

    const googleId = extractGoogleSpreadsheetId(url);
    if (googleId !== undefined && this.#spreadsheets.has(googleId)) {
      return this.getSpreadsheet(googleId);
    }

    throw new Error(`Unknown local Spreadsheet URL: ${url}`);
  }

  async getSpreadsheetMetadata(spreadsheet: SpreadsheetReference): Promise<SpreadsheetMetadata> {
    return { ...this.#getSpreadsheetState(spreadsheet.id).metadata };
  }

  async getSpreadsheetLocale(spreadsheet: SpreadsheetReference): Promise<string> {
    return this.#getSpreadsheetState(spreadsheet.id).locale;
  }

  async getSpreadsheetTimeZone(spreadsheet: SpreadsheetReference): Promise<string> {
    return this.#getSpreadsheetState(spreadsheet.id).timeZone;
  }

  async renameSpreadsheet(spreadsheet: SpreadsheetReference, name: string): Promise<void> {
    const state = this.#getSpreadsheetState(spreadsheet.id);

    this.#spreadsheets.set(spreadsheet.id, {
      ...state,
      metadata: {
        ...state.metadata,
        name,
      },
    });
  }

  async setSpreadsheetLocale(spreadsheet: SpreadsheetReference, locale: string): Promise<void> {
    const state = this.#getSpreadsheetState(spreadsheet.id);

    this.#spreadsheets.set(spreadsheet.id, {
      ...state,
      locale,
    });
  }

  async setSpreadsheetTimeZone(spreadsheet: SpreadsheetReference, timeZone: string): Promise<void> {
    const state = this.#getSpreadsheetState(spreadsheet.id);

    this.#spreadsheets.set(spreadsheet.id, {
      ...state,
      timeZone,
    });
  }

  async listSheets(spreadsheet: SpreadsheetReference): Promise<readonly SheetReference[]> {
    return [...this.#getSpreadsheetState(spreadsheet.id).sheets.values()].map(({ reference }) =>
      cloneSheetReference(reference),
    );
  }

  async insertSheet(
    spreadsheet: SpreadsheetReference,
    name?: string,
    index?: number,
  ): Promise<SheetReference> {
    const state = this.#getSpreadsheetState(spreadsheet.id);
    const insertionIndex = index ?? state.sheets.size;

    assertInteger(insertionIndex, "Spreadsheet sheet index");
    if (insertionIndex < 0 || insertionIndex > state.sheets.size) {
      throw new RangeError(`Spreadsheet sheet index must be between 0 and ${state.sheets.size}.`);
    }

    let resolvedName = name;
    if (resolvedName === undefined) {
      // Apps Script documents a default Sheet name but not its allocation algorithm. Vegas uses
      // the first available SheetN name so local creation is deterministic.
      const names = new Set([...state.sheets.values()].map(({ metadata }) => metadata.name));
      let suffix = 1;
      while (names.has(`Sheet${suffix}`)) {
        suffix += 1;
      }
      resolvedName = `Sheet${suffix}`;
    }

    for (const sibling of state.sheets.values()) {
      if (sibling.metadata.name === resolvedName) {
        throw new Error(`Duplicate local Spreadsheet sheet name: ${resolvedName}`);
      }
    }

    const sheetId = state.nextSheetId;
    const sheet = createSheetState(spreadsheet.id, {
      id: sheetId,
      name: resolvedName,
      // Apps Script does not document the dimensions of a newly inserted blank Sheet. Vegas uses
      // the same deterministic blank-grid dimensions as SpreadsheetApp.create(name).
      maxRows: DEFAULT_LOCAL_SPREADSHEET_ROWS,
      maxColumns: DEFAULT_LOCAL_SPREADSHEET_COLUMNS,
    });
    const entries = [...state.sheets.entries()];
    entries.splice(insertionIndex, 0, [sheetId, sheet]);

    state.sheets.clear();
    for (const [id, entry] of entries) {
      state.sheets.set(id, entry);
    }
    state.nextSheetId += 1;

    return cloneSheetReference(sheet.reference);
  }

  async deleteSheet(sheet: SheetReference): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);

    // Google documents deleting the specified Sheet but does not define last-Sheet behavior.
    // Vegas keeps the local model's existing ability to represent a Spreadsheet with zero Sheets
    // instead of inventing an additional minimum-Sheet rule.
    this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);
    spreadsheet.sheets.delete(sheet.sheetId);
  }

  async getSheet(
    spreadsheet: SpreadsheetReference,
    sheetId: number,
  ): Promise<SheetReference | null> {
    const state = this.#getSpreadsheetState(spreadsheet.id).sheets.get(sheetId);

    return state === undefined ? null : cloneSheetReference(state.reference);
  }

  async getSheetByName(
    spreadsheet: SpreadsheetReference,
    name: string,
  ): Promise<SheetReference | null> {
    const spreadsheetState = this.#getSpreadsheetState(spreadsheet.id);

    for (const state of spreadsheetState.sheets.values()) {
      if (state.metadata.name === name) {
        return cloneSheetReference(state.reference);
      }
    }

    return null;
  }

  async getSheetMetadata(sheet: SheetReference): Promise<SheetMetadata> {
    return { ...this.#getSheetState(sheet.spreadsheetId, sheet.sheetId).metadata };
  }

  async deleteSheetColumns(
    sheet: SheetReference,
    startColumn: number,
    numColumns: number,
  ): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);
    assertColumnDeletion(startColumn, numColumns, state.metadata.maxColumns);

    state.grid.deleteColumns(startColumn, numColumns);

    const hiddenColumns = remapDeletedDimensionPositions(
      state.hiddenColumns,
      startColumn,
      numColumns,
    );

    const maxColumns = state.metadata.maxColumns - numColumns;

    // Apps Script documents that deletion removes columns and shifts later columns left, but not
    // how hidden and frozen state is remapped. Vegas drops hidden markers in the deleted span,
    // shifts later markers left, and preserves the frozen count unless the new grid is smaller.
    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      metadata: {
        ...state.metadata,
        maxColumns,
        frozenColumns: Math.min(state.metadata.frozenColumns, maxColumns),
      },
      hiddenColumns,
    });
  }

  async deleteSheetRows(sheet: SheetReference, startRow: number, numRows: number): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);
    assertRowDeletion(startRow, numRows, state.metadata.maxRows);

    state.grid.deleteRows(startRow, numRows);

    const hiddenRows = remapDeletedDimensionPositions(state.hiddenRows, startRow, numRows);

    const maxRows = state.metadata.maxRows - numRows;

    // Apps Script documents that deletion removes rows and shifts later rows up, but not how
    // hidden and frozen state is remapped. Vegas drops hidden markers in the deleted span, shifts
    // later markers up, and preserves the frozen count unless the new grid is smaller.
    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      metadata: {
        ...state.metadata,
        maxRows,
        frozenRows: Math.min(state.metadata.frozenRows, maxRows),
      },
      hiddenRows,
    });
  }

  async insertSheetColumns(
    sheet: SheetReference,
    startColumn: number,
    numColumns: number,
  ): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);
    assertColumnInsertion(startColumn, numColumns, state.metadata.maxColumns);

    state.grid.insertColumns(startColumn, numColumns);

    const hiddenColumns = remapInsertedDimensionPositions(
      state.hiddenColumns,
      startColumn,
      numColumns,
    );

    // Apps Script documents that insertion shifts existing columns right, but not how hidden and
    // frozen column state is remapped. Vegas moves hidden-column markers with shifted columns and
    // preserves the frozen-column count.
    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      metadata: {
        ...state.metadata,
        maxColumns: state.metadata.maxColumns + numColumns,
      },
      hiddenColumns,
    });
  }

  async insertSheetRows(sheet: SheetReference, startRow: number, numRows: number): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);
    assertRowInsertion(startRow, numRows, state.metadata.maxRows);

    state.grid.insertRows(startRow, numRows);

    const hiddenRows = remapInsertedDimensionPositions(state.hiddenRows, startRow, numRows);

    // Apps Script documents that insertion shifts existing rows down, but not how hidden and
    // frozen row state is remapped. Vegas moves hidden-row markers with shifted rows and preserves
    // the frozen-row count.
    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      metadata: {
        ...state.metadata,
        maxRows: state.metadata.maxRows + numRows,
      },
      hiddenRows,
    });
  }

  async moveSheetColumns(
    sheet: SheetReference,
    sourceStart: number,
    sourceCount: number,
    destinationIndex: number,
  ): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);

    state.grid.moveColumns(sourceStart, sourceCount, destinationIndex);

    const hiddenColumns = remapMovedDimensionPositions(
      state.hiddenColumns,
      sourceStart,
      sourceCount,
      destinationIndex,
    );

    // Apps Script documents moved column data but not hidden/frozen remapping. Vegas moves hidden
    // markers with their columns while keeping the position-based frozen-column count unchanged.
    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      hiddenColumns,
    });
  }

  async moveSheetRows(
    sheet: SheetReference,
    sourceStart: number,
    sourceCount: number,
    destinationIndex: number,
  ): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);

    state.grid.moveRows(sourceStart, sourceCount, destinationIndex);

    const hiddenRows = remapMovedDimensionPositions(
      state.hiddenRows,
      sourceStart,
      sourceCount,
      destinationIndex,
    );

    // Apps Script documents moved row data but not hidden/frozen remapping. Vegas moves hidden
    // markers with their rows while keeping the position-based frozen-row count unchanged.
    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      hiddenRows,
    });
  }

  async isSheetColumnHiddenByUser(sheet: SheetReference, column: number): Promise<boolean> {
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);
    assertColumnSpan(column, 1, state.metadata.maxColumns);

    return state.hiddenColumns.has(column);
  }

  async isSheetRowHiddenByUser(sheet: SheetReference, row: number): Promise<boolean> {
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);
    assertRowSpan(row, 1, state.metadata.maxRows);

    return state.hiddenRows.has(row);
  }

  async renameSheet(sheet: SheetReference, name: string): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);

    for (const sibling of spreadsheet.sheets.values()) {
      if (sibling.reference.sheetId !== sheet.sheetId && sibling.metadata.name === name) {
        throw new Error(`Duplicate local Spreadsheet sheet name: ${name}`);
      }
    }

    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      metadata: {
        ...state.metadata,
        name,
      },
    });
  }

  async setSheetColumnsHidden(
    sheet: SheetReference,
    startColumn: number,
    numColumns: number,
    hidden: boolean,
  ): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);
    assertColumnSpan(startColumn, numColumns, state.metadata.maxColumns);

    const hiddenColumns = new Set(state.hiddenColumns);
    for (let column = startColumn; column < startColumn + numColumns; column += 1) {
      if (hidden) {
        hiddenColumns.add(column);
      } else {
        hiddenColumns.delete(column);
      }
    }

    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      hiddenColumns,
    });
  }

  async setSheetRowsHidden(
    sheet: SheetReference,
    startRow: number,
    numRows: number,
    hidden: boolean,
  ): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);
    assertRowSpan(startRow, numRows, state.metadata.maxRows);

    const hiddenRows = new Set(state.hiddenRows);
    for (let row = startRow; row < startRow + numRows; row += 1) {
      if (hidden) {
        hiddenRows.add(row);
      } else {
        hiddenRows.delete(row);
      }
    }

    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      hiddenRows,
    });
  }

  async setSheetFrozenColumns(sheet: SheetReference, columns: number): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);
    assertFrozenCount(columns, state.metadata.maxColumns, "Spreadsheet sheet frozen columns");

    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      metadata: {
        ...state.metadata,
        frozenColumns: columns,
      },
    });
  }

  async setSheetFrozenRows(sheet: SheetReference, rows: number): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);
    assertFrozenCount(rows, state.metadata.maxRows, "Spreadsheet sheet frozen rows");

    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      metadata: {
        ...state.metadata,
        frozenRows: rows,
      },
    });
  }

  async setSheetHidden(sheet: SheetReference, hidden: boolean): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);

    if (state.metadata.hidden === hidden) {
      return;
    }

    if (hidden) {
      const visibleSheetCount = [...spreadsheet.sheets.values()].filter(
        ({ metadata }) => !metadata.hidden,
      ).length;

      if (visibleSheetCount === 1) {
        // Google documents the exception condition, but not its message.
        throw new Error("Cannot hide the only visible local Spreadsheet sheet.");
      }
    }

    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      metadata: {
        ...state.metadata,
        hidden,
      },
    });
  }

  async setSheetHiddenGridlines(sheet: SheetReference, hidden: boolean): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);

    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      metadata: {
        ...state.metadata,
        hiddenGridlines: hidden,
      },
    });
  }

  async setSheetRightToLeft(sheet: SheetReference, rightToLeft: boolean): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);

    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      metadata: {
        ...state.metadata,
        rightToLeft,
      },
    });
  }

  async setSheetTabColor(sheet: SheetReference, tabColor: string | null): Promise<void> {
    const spreadsheet = this.#getSpreadsheetState(sheet.spreadsheetId);
    const state = this.#getSheetState(sheet.spreadsheetId, sheet.sheetId);

    // Apps Script documents CSS color notation and null reset semantics, but not invalid-color
    // handling. Vegas stores local tab-color strings verbatim instead of guessing Google parsing.
    spreadsheet.sheets.set(sheet.sheetId, {
      ...state,
      metadata: {
        ...state.metadata,
        tabColor,
      },
    });
  }

  async clearSheetNotes(sheet: SheetReference): Promise<void> {
    this.#getSheetState(sheet.spreadsheetId, sheet.sheetId).grid.clearNotes();
  }

  async getSheetDataBounds(sheet: SheetReference): Promise<SheetDataBounds> {
    return this.#getSheetState(sheet.spreadsheetId, sheet.sheetId).grid.getDataBounds();
  }

  async getRangeNotes(range: RangeReference): Promise<SpreadsheetNoteGrid> {
    return this.#getSheetState(range.spreadsheetId, range.sheetId).grid.getNotes(range);
  }

  async getRangeValues(range: RangeReference): Promise<SpreadsheetGrid> {
    return this.#getSheetState(range.spreadsheetId, range.sheetId).grid.getValues(range);
  }

  async setRangeNotes(range: RangeReference, notes: SpreadsheetNoteGrid): Promise<void> {
    this.#getSheetState(range.spreadsheetId, range.sheetId).grid.setNotes(range, notes);
  }

  async setRangeValues(range: RangeReference, values: SpreadsheetGrid): Promise<void> {
    this.#getSheetState(range.spreadsheetId, range.sheetId).grid.setValues(range, values);
  }

  #assertUrlAvailable(url: string | undefined, spreadsheetId: string): void {
    if (url === undefined) {
      return;
    }

    const existingId = this.#spreadsheetIdsByUrl.get(url);

    if (existingId !== undefined && existingId !== spreadsheetId) {
      throw new Error(`Duplicate local Spreadsheet URL: ${url}`);
    }
  }

  #createSpreadsheetId(): string {
    while (true) {
      this.#nextSpreadsheetId += 1;
      const id = `spreadsheet:${this.#nextSpreadsheetId}`;

      if (!this.#spreadsheets.has(id)) {
        return id;
      }
    }
  }

  #getSpreadsheetState(id: string): SpreadsheetState {
    const state = this.#spreadsheets.get(id);

    if (!state) {
      throw new Error(`Unknown local Spreadsheet: ${id}`);
    }

    return state;
  }

  #getSheetState(spreadsheetId: string, sheetId: number): SheetState {
    const spreadsheet = this.#getSpreadsheetState(spreadsheetId);
    const state = spreadsheet.sheets.get(sheetId);

    if (!state) {
      throw new Error(`Unknown local Spreadsheet sheet: ${spreadsheetId}#${sheetId}`);
    }

    return state;
  }
}
