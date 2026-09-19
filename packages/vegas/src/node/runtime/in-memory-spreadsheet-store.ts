import { InMemorySpreadsheetGrid } from "./in-memory-spreadsheet-grid";
import type { RangeReference, SheetReference, SpreadsheetReference } from "./spreadsheet-reference";
import type {
  SheetDataBounds,
  SheetMetadata,
  SpreadsheetGrid,
  SpreadsheetMetadata,
  SpreadsheetStore,
} from "./spreadsheet-store";
import { assertPositiveInteger } from "./spreadsheet-validation";

export interface InMemorySheetSeed {
  readonly id: number;
  readonly name: string;
  readonly maxRows: number;
  readonly maxColumns: number;
  readonly hiddenGridlines?: boolean;
  readonly rightToLeft?: boolean;
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

function createSheetState(spreadsheetId: string, seed: InMemorySheetSeed): SheetState {
  if (!Number.isInteger(seed.id)) {
    throw new RangeError("Spreadsheet sheet id must be an integer.");
  }

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
      hiddenGridlines: seed.hiddenGridlines ?? false,
      rightToLeft: seed.rightToLeft ?? false,
    },
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

  async getSheetDataBounds(sheet: SheetReference): Promise<SheetDataBounds> {
    return this.#getSheetState(sheet.spreadsheetId, sheet.sheetId).grid.getDataBounds();
  }

  async getRangeValues(range: RangeReference): Promise<SpreadsheetGrid> {
    return this.#getSheetState(range.spreadsheetId, range.sheetId).grid.getValues(range);
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
