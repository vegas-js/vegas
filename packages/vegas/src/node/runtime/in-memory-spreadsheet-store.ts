import { InMemorySpreadsheetGrid } from "./in-memory-spreadsheet-grid";
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

type SpreadsheetState = {
  readonly reference: SpreadsheetReference;
  readonly metadata: SpreadsheetMetadata;
  readonly sheets: Map<number, SheetState>;
};

function cloneSpreadsheetReference(reference: SpreadsheetReference): SpreadsheetReference {
  return { ...reference };
}

function cloneSheetReference(reference: SheetReference): SheetReference {
  return { ...reference };
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

// Apps Script documents 1-based row positions, but not invalid-span behavior.
// Vegas constrains local row visibility spans to the current Sheet grid.
function assertRowSpan(startRow: number, numRows: number, maximum: number): void {
  assertPositiveInteger(startRow, "Spreadsheet sheet row start");
  assertPositiveInteger(numRows, "Spreadsheet sheet row count");

  if (startRow + numRows - 1 > maximum) {
    throw new RangeError(`Spreadsheet sheet rows must stay within 1 and ${maximum}.`);
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

export class InMemorySpreadsheetStore implements SpreadsheetStore {
  readonly #spreadsheets = new Map<string, SpreadsheetState>();
  #nextSpreadsheetId = 0;

  constructor(spreadsheets: readonly InMemorySpreadsheetSeed[] = []) {
    for (const seed of spreadsheets) {
      if (this.#spreadsheets.has(seed.id)) {
        throw new Error(`Duplicate local Spreadsheet id: ${seed.id}`);
      }

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

      this.#spreadsheets.set(seed.id, {
        reference: {
          service: "spreadsheet",
          kind: "spreadsheet",
          id: seed.id,
        },
        metadata: {
          name: seed.name,
        },
        sheets,
      });
    }
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
      sheets: new Map([[sheet.reference.sheetId, sheet]]),
    });

    return cloneSpreadsheetReference(reference);
  }

  async getSpreadsheet(id: string): Promise<SpreadsheetReference> {
    return cloneSpreadsheetReference(this.#getSpreadsheetState(id).reference);
  }

  async getSpreadsheetMetadata(spreadsheet: SpreadsheetReference): Promise<SpreadsheetMetadata> {
    return { ...this.#getSpreadsheetState(spreadsheet.id).metadata };
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

  async listSheets(spreadsheet: SpreadsheetReference): Promise<readonly SheetReference[]> {
    return [...this.#getSpreadsheetState(spreadsheet.id).sheets.values()].map(({ reference }) =>
      cloneSheetReference(reference),
    );
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
