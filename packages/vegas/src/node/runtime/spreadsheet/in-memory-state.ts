import { InMemorySpreadsheetGrid } from "./in-memory-grid";
import type { SheetReference, SpreadsheetReference } from "./reference";
import type { SheetMetadata, SpreadsheetGrid, SpreadsheetMetadata } from "./store";
import { assertInteger } from "./validation";

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

export type SheetState = {
  readonly reference: SheetReference;
  readonly metadata: SheetMetadata;
  readonly hiddenColumns: ReadonlySet<number>;
  readonly hiddenRows: ReadonlySet<number>;
  readonly grid: InMemorySpreadsheetGrid;
};

export type SpreadsheetState = {
  readonly reference: SpreadsheetReference;
  readonly metadata: SpreadsheetMetadata;
  readonly locale: string;
  readonly timeZone: string;
  readonly ownership: "fixture" | "runtime";
  readonly url?: string;
  readonly sheets: Map<number, SheetState>;
  nextSheetId: number;
};

function cloneSheetState(state: SheetState): SheetState {
  return {
    reference: { ...state.reference },
    metadata: { ...state.metadata },
    hiddenColumns: new Set(state.hiddenColumns),
    hiddenRows: new Set(state.hiddenRows),
    grid: state.grid.clone(),
  };
}

export function cloneSpreadsheetState(state: SpreadsheetState): SpreadsheetState {
  return {
    reference: { ...state.reference },
    metadata: { ...state.metadata },
    locale: state.locale,
    timeZone: state.timeZone,
    ownership: state.ownership,
    url: state.url,
    sheets: new Map([...state.sheets].map(([sheetId, sheet]) => [sheetId, cloneSheetState(sheet)])),
    nextSheetId: state.nextSheetId,
  };
}

export function createSheetState(spreadsheetId: string, seed: InMemorySheetSeed): SheetState {
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
  ownership: SpreadsheetState["ownership"],
): SpreadsheetState {
  const sheets = new Map<number, SheetState>();
  const sheetNames = new Set<string>();
  let nextSheetId = 0;

  for (const sheetSeed of seed.sheets) {
    if (sheets.has(sheetSeed.id)) {
      throw new Error(`Duplicate local Spreadsheet sheet id: ${seed.id}#${sheetSeed.id}`);
    }
    if (sheetNames.has(sheetSeed.name)) {
      throw new Error(`Duplicate local Spreadsheet sheet name: ${sheetSeed.name}`);
    }

    sheets.set(sheetSeed.id, createSheetState(seed.id, sheetSeed));
    sheetNames.add(sheetSeed.name);
    nextSheetId = Math.max(nextSheetId, sheetSeed.id + 1);
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
    nextSheetId,
  };
}

export function createFixtureSpreadsheetState(seed: InMemorySpreadsheetSeed): SpreadsheetState {
  return createSpreadsheetState(seed, "fixture");
}

export function createRuntimeSpreadsheetState(
  id: string,
  name: string,
  rows: number,
  columns: number,
): SpreadsheetState {
  const sheet = createSheetState(id, {
    id: 0,
    name: "Sheet1",
    maxRows: rows,
    maxColumns: columns,
  });

  return {
    reference: {
      service: "spreadsheet",
      kind: "spreadsheet",
      id,
    },
    metadata: {
      name,
    },
    locale: DEFAULT_SPREADSHEET_LOCALE,
    timeZone: DEFAULT_SPREADSHEET_TIME_ZONE,
    ownership: "runtime",
    sheets: new Map([[sheet.reference.sheetId, sheet]]),
    nextSheetId: 1,
  };
}
