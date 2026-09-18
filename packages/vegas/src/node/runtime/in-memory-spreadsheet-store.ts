import type { RangeReference, SheetReference, SpreadsheetReference } from "./spreadsheet-reference";
import type {
  SheetMetadata,
  SpreadsheetCellValue,
  SpreadsheetGrid,
  SpreadsheetMetadata,
  SpreadsheetStore,
} from "./spreadsheet-store";

export interface InMemorySheetSeed {
  readonly id: number;
  readonly name: string;
  readonly maxRows: number;
  readonly maxColumns: number;
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
  readonly cells: Map<string, SpreadsheetCellValue>;
};

type SpreadsheetState = {
  readonly reference: SpreadsheetReference;
  readonly metadata: SpreadsheetMetadata;
  readonly sheets: Map<number, SheetState>;
};

function cloneCellValue(value: SpreadsheetCellValue): SpreadsheetCellValue {
  return value instanceof Date ? new Date(value.getTime()) : value;
}

function cloneSpreadsheetReference(reference: SpreadsheetReference): SpreadsheetReference {
  return { ...reference };
}

function cloneSheetReference(reference: SheetReference): SheetReference {
  return { ...reference };
}

function createCellKey(row: number, column: number): string {
  return `${row}:${column}`;
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer.`);
  }
}

function validateRange(range: RangeReference, metadata: SheetMetadata): void {
  assertPositiveInteger(range.row, "Spreadsheet range row");
  assertPositiveInteger(range.column, "Spreadsheet range column");
  assertPositiveInteger(range.numRows, "Spreadsheet range numRows");
  assertPositiveInteger(range.numColumns, "Spreadsheet range numColumns");

  const lastRow = range.row + range.numRows - 1;
  const lastColumn = range.column + range.numColumns - 1;

  if (lastRow > metadata.maxRows || lastColumn > metadata.maxColumns) {
    throw new RangeError("Spreadsheet range is outside sheet bounds.");
  }
}

function createSheetState(spreadsheetId: string, seed: InMemorySheetSeed): SheetState {
  if (!Number.isInteger(seed.id)) {
    throw new RangeError("Spreadsheet sheet id must be an integer.");
  }

  assertPositiveInteger(seed.maxRows, "Spreadsheet sheet maxRows");
  assertPositiveInteger(seed.maxColumns, "Spreadsheet sheet maxColumns");

  const values = seed.values ?? [];
  if (values.length > seed.maxRows) {
    throw new RangeError("Spreadsheet seed values exceed sheet row bounds.");
  }

  const width = values[0]?.length ?? 0;
  if (width > seed.maxColumns) {
    throw new RangeError("Spreadsheet seed values exceed sheet column bounds.");
  }

  for (const row of values) {
    if (row.length !== width) {
      throw new RangeError("Spreadsheet seed values must be rectangular.");
    }
  }

  const cells = new Map<string, SpreadsheetCellValue>();
  values.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (value !== "") {
        cells.set(createCellKey(rowIndex + 1, columnIndex + 1), cloneCellValue(value));
      }
    });
  });

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
    },
    cells,
  };
}

export class InMemorySpreadsheetStore implements SpreadsheetStore {
  readonly #spreadsheets = new Map<string, SpreadsheetState>();

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

  async getSpreadsheet(id: string): Promise<SpreadsheetReference> {
    return cloneSpreadsheetReference(this.#getSpreadsheetState(id).reference);
  }

  async getSpreadsheetMetadata(spreadsheet: SpreadsheetReference): Promise<SpreadsheetMetadata> {
    return { ...this.#getSpreadsheetState(spreadsheet.id).metadata };
  }

  async listSheets(spreadsheet: SpreadsheetReference): Promise<readonly SheetReference[]> {
    return [...this.#getSpreadsheetState(spreadsheet.id).sheets.values()].map(({ reference }) =>
      cloneSheetReference(reference),
    );
  }

  async getSheet(spreadsheet: SpreadsheetReference, sheetId: number): Promise<SheetReference> {
    return cloneSheetReference(this.#getSheetState(spreadsheet.id, sheetId).reference);
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

  async getRangeValues(range: RangeReference): Promise<SpreadsheetGrid> {
    const sheet = this.#getSheetState(range.spreadsheetId, range.sheetId);
    validateRange(range, sheet.metadata);

    return Array.from({ length: range.numRows }, (_, rowOffset) =>
      Array.from({ length: range.numColumns }, (_, columnOffset) => {
        const value = sheet.cells.get(
          createCellKey(range.row + rowOffset, range.column + columnOffset),
        );
        return value === undefined ? "" : cloneCellValue(value);
      }),
    );
  }

  async setRangeValues(range: RangeReference, values: SpreadsheetGrid): Promise<void> {
    const sheet = this.#getSheetState(range.spreadsheetId, range.sheetId);
    validateRange(range, sheet.metadata);

    if (values.length !== range.numRows || values.some((row) => row.length !== range.numColumns)) {
      throw new RangeError("Spreadsheet values dimensions must match the target range.");
    }

    const copiedValues = values.map((row) => row.map(cloneCellValue));

    copiedValues.forEach((row, rowOffset) => {
      row.forEach((value, columnOffset) => {
        const key = createCellKey(range.row + rowOffset, range.column + columnOffset);

        if (value === "") {
          sheet.cells.delete(key);
        } else {
          sheet.cells.set(key, value);
        }
      });
    });
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
