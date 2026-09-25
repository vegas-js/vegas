import { InMemorySpreadsheetGrid, remapMovedDimensionPosition } from "./in-memory-spreadsheet-grid";
import type { RangeReference, SheetReference, SpreadsheetReference } from "./spreadsheet-reference";
import type {
  SheetDataBounds,
  SheetMetadata,
  SpreadsheetGrid,
  SpreadsheetMetadata,
  SpreadsheetNoteGrid,
  SpreadsheetStore,
} from "./spreadsheet-store";
import { assertInteger, assertPositiveInteger } from "./spreadsheet-validation";

// Apps Script exposes Spreadsheet locale and time zone but does not define defaults for a local
// runtime. Vegas uses fixed values so fixtures and runtime-created Spreadsheets are deterministic.
const DEFAULT_SPREADSHEET_LOCALE = "en_US";
const DEFAULT_SPREADSHEET_TIME_ZONE = "Etc/UTC";

export interface InMemorySheetSeed {
  readonly id: number;
  readonly name: string;
  readonly maxRows: number;
  readonly maxColumns: number;
  readonly hidden?: boolean;
  readonly hiddenGridlines?: boolean;
  readonly rightToLeft?: boolean;
  readonly tabColor?: string | null;
  readonly values?: SpreadsheetGrid;
}

export interface InMemorySpreadsheetSeed {
  readonly id: string;
  readonly url?: string;
  readonly name: string;
  readonly sheets: readonly InMemorySheetSeed[];
}

type SheetState = {
  readonly reference: SheetReference;
  readonly metadata: SheetMetadata;
  readonly hiddenColumns: ReadonlySet<number>;
  readonly hiddenRows: ReadonlySet<number>;
  readonly grid: InMemorySpreadsheetGrid;
};

type SpreadsheetOwnership = "fixture" | "runtime";

type SpreadsheetState = {
  readonly reference: SpreadsheetReference;
  readonly metadata: SpreadsheetMetadata;
  readonly locale: string;
  readonly timeZone: string;
  readonly ownership: SpreadsheetOwnership;
  readonly url?: string;
  readonly sheets: Map<number, SheetState>;
};

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

// Apps Script documents integer counts and zero-to-unfreeze semantics, but not invalid-count
// behavior. Vegas constrains local frozen counts to the current Sheet grid bounds.
function assertFrozenCount(value: number, maximum: number, label: string): void {
  assertInteger(value, label);

  if (value < 0 || value > maximum) {
    throw new RangeError(`${label} must be between 0 and ${maximum}.`);
  }
}

// Apps Script documents 1-based column positions, but not invalid-span behavior.
// Vegas constrains local column visibility spans to the current Sheet grid.
function assertColumnSpan(startColumn: number, numColumns: number, maximum: number): void {
  assertPositiveInteger(startColumn, "Spreadsheet sheet column start");
  assertPositiveInteger(numColumns, "Spreadsheet sheet column count");

  if (startColumn + numColumns - 1 > maximum) {
    throw new RangeError(`Spreadsheet sheet columns must stay within 1 and ${maximum}.`);
  }
}

function assertColumnDeletion(startColumn: number, numColumns: number, maximum: number): void {
  assertColumnSpan(startColumn, numColumns, maximum);

  // Apps Script does not document deleting every column. Vegas preserves the local grid
  // invariant that a Sheet always has at least one column.
  if (numColumns >= maximum) {
    throw new RangeError("Spreadsheet sheet must retain at least one column.");
  }
}

// Apps Script documents 1-based insertion positions but not out-of-bounds behavior. Vegas
// accepts maxColumns + 1 as an append position and rejects positions that would leave a gap.
function assertColumnInsertion(startColumn: number, numColumns: number, maximum: number): void {
  assertPositiveInteger(startColumn, "Spreadsheet sheet column start");
  assertPositiveInteger(numColumns, "Spreadsheet sheet column count");

  if (startColumn > maximum + 1) {
    throw new RangeError(
      `Spreadsheet sheet column insertion must start between 1 and ${maximum + 1}.`,
    );
  }
}

// Apps Script documents 1-based row positions, but not invalid-span behavior.
// Vegas constrains local row visibility spans to the current Sheet grid.
function assertRowSpan(startRow: number, numRows: number, maximum: number): void {
  assertPositiveInteger(startRow, "Spreadsheet sheet row start");
  assertPositiveInteger(numRows, "Spreadsheet sheet row count");

  if (startRow + numRows - 1 > maximum) {
    throw new RangeError(`Spreadsheet sheet rows must stay within 1 and ${maximum}.`);
  }
}

function assertRowDeletion(startRow: number, numRows: number, maximum: number): void {
  assertRowSpan(startRow, numRows, maximum);

  // Apps Script does not document deleting every row. Vegas preserves the local grid invariant
  // that a Sheet always has at least one row.
  if (numRows >= maximum) {
    throw new RangeError("Spreadsheet sheet must retain at least one row.");
  }
}

// Apps Script documents 1-based insertion positions but not out-of-bounds behavior. Vegas
// accepts maxRows + 1 as an append position and rejects positions that would leave a gap.
function assertRowInsertion(startRow: number, numRows: number, maximum: number): void {
  assertPositiveInteger(startRow, "Spreadsheet sheet row start");
  assertPositiveInteger(numRows, "Spreadsheet sheet row count");

  if (startRow > maximum + 1) {
    throw new RangeError(
      `Spreadsheet sheet row insertion must start between 1 and ${maximum + 1}.`,
    );
  }
}

function createSheetState(spreadsheetId: string, seed: InMemorySheetSeed): SheetState {
  assertInteger(seed.id, "Spreadsheet sheet id");

  return {
    reference: {
      service: "spreadsheet",
      kind: "sheet",
      spreadsheetId,
      sheetId: seed.id,
    },
    metadata: {
      name: seed.name,
      maxRows: seed.maxRows,
      maxColumns: seed.maxColumns,
      frozenColumns: 0,
      frozenRows: 0,
      hidden: seed.hidden ?? false,
      hiddenGridlines: seed.hiddenGridlines ?? false,
      rightToLeft: seed.rightToLeft ?? false,
      tabColor: seed.tabColor ?? null,
    },
    hiddenColumns: new Set(),
    hiddenRows: new Set(),
    grid: new InMemorySpreadsheetGrid(seed.maxRows, seed.maxColumns, seed.values),
  };
}

function createSpreadsheetState(
  seed: InMemorySpreadsheetSeed,
  ownership: SpreadsheetOwnership,
): SpreadsheetState {
  const sheets = new Map<number, SheetState>();
  const sheetNames = new Set<string>();

  for (const sheetSeed of seed.sheets) {
    if (sheets.has(sheetSeed.id)) {
      throw new Error(`Duplicate local Spreadsheet sheet id: ${seed.id}#${sheetSeed.id}`);
    }
    if (sheetNames.has(sheetSeed.name)) {
      throw new Error(`Duplicate local Spreadsheet sheet name: ${sheetSeed.name}`);
    }

    sheets.set(sheetSeed.id, createSheetState(seed.id, sheetSeed));
    sheetNames.add(sheetSeed.name);
  }

  return {
    reference: {
      service: "spreadsheet",
      kind: "spreadsheet",
      id: seed.id,
    },
    metadata: {
      name: seed.name,
    },
    locale: DEFAULT_SPREADSHEET_LOCALE,
    timeZone: DEFAULT_SPREADSHEET_TIME_ZONE,
    ownership,
    url: seed.url,
    sheets,
  };
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

      const state = createSpreadsheetState(seed, "fixture");

      if (state.url !== undefined) {
        this.#spreadsheetIdsByUrl.set(state.url, seed.id);
      }

      this.#spreadsheets.set(seed.id, state);
    }
  }

  clone(): InMemorySpreadsheetStore {
    const clone = new InMemorySpreadsheetStore();

    for (const [id, state] of this.#spreadsheets) {
      clone.#spreadsheets.set(id, {
        reference: cloneSpreadsheetReference(state.reference),
        metadata: { ...state.metadata },
        locale: state.locale,
        timeZone: state.timeZone,
        ownership: state.ownership,
        url: state.url,
        sheets: new Map(
          [...state.sheets].map(([sheetId, sheet]) => [
            sheetId,
            {
              reference: cloneSheetReference(sheet.reference),
              metadata: { ...sheet.metadata },
              hiddenColumns: new Set(sheet.hiddenColumns),
              hiddenRows: new Set(sheet.hiddenRows),
              grid: sheet.grid.clone(),
            },
          ]),
        ),
      });
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
    const reference: SpreadsheetReference = {
      service: "spreadsheet",
      kind: "spreadsheet",
      id,
    };
    const sheet = createSheetState(id, {
      id: 0,
      name: "Sheet1",
      maxRows: rows,
      maxColumns: columns,
    });

    this.#spreadsheets.set(id, {
      reference,
      metadata: {
        name,
      },
      locale: DEFAULT_SPREADSHEET_LOCALE,
      timeZone: DEFAULT_SPREADSHEET_TIME_ZONE,
      ownership: "runtime",
      sheets: new Map([[sheet.reference.sheetId, sheet]]),
    });

    return cloneSpreadsheetReference(reference);
  }

  replaceFixtureSpreadsheet(seed: InMemorySpreadsheetSeed): void {
    const existing = this.#spreadsheets.get(seed.id);

    if (existing?.ownership === "runtime") {
      throw new Error(`Cannot replace runtime-created local Spreadsheet with fixture: ${seed.id}`);
    }

    this.#assertUrlAvailable(seed.url, seed.id);

    const next = createSpreadsheetState(seed, "fixture");

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

    const endColumn = startColumn + numColumns - 1;
    const hiddenColumns = new Set<number>();
    for (const column of state.hiddenColumns) {
      if (column < startColumn) {
        hiddenColumns.add(column);
      } else if (column > endColumn) {
        hiddenColumns.add(column - numColumns);
      }
    }

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

    const endRow = startRow + numRows - 1;
    const hiddenRows = new Set<number>();
    for (const row of state.hiddenRows) {
      if (row < startRow) {
        hiddenRows.add(row);
      } else if (row > endRow) {
        hiddenRows.add(row - numRows);
      }
    }

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

    const hiddenColumns = new Set<number>();
    for (const column of state.hiddenColumns) {
      hiddenColumns.add(column >= startColumn ? column + numColumns : column);
    }

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

    const hiddenRows = new Set<number>();
    for (const row of state.hiddenRows) {
      hiddenRows.add(row >= startRow ? row + numRows : row);
    }

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

    const hiddenColumns = new Set(
      [...state.hiddenColumns].map((column) =>
        remapMovedDimensionPosition(column, sourceStart, sourceCount, destinationIndex),
      ),
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

    const hiddenRows = new Set(
      [...state.hiddenRows].map((row) =>
        remapMovedDimensionPosition(row, sourceStart, sourceCount, destinationIndex),
      ),
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
