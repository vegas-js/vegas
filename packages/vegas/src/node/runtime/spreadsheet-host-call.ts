import type { RangeReference, SheetReference, SpreadsheetReference } from "./spreadsheet-reference";
import type {
  SheetDataBounds,
  SheetMetadata,
  SpreadsheetGrid,
  SpreadsheetMetadata,
  SpreadsheetNoteGrid,
} from "./spreadsheet-store";

export type SpreadsheetHostCall =
  | {
      readonly service: "spreadsheet";
      readonly operation: "create-spreadsheet";
      readonly name: string;
      readonly rows: number;
      readonly columns: number;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-spreadsheet";
      readonly id: string;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-spreadsheet-by-url";
      readonly url: string;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-spreadsheet-url";
      readonly spreadsheet: SpreadsheetReference;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-spreadsheet-metadata";
      readonly spreadsheet: SpreadsheetReference;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-spreadsheet-locale";
      readonly spreadsheet: SpreadsheetReference;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-spreadsheet-time-zone";
      readonly spreadsheet: SpreadsheetReference;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "rename-spreadsheet";
      readonly spreadsheet: SpreadsheetReference;
      readonly name: string;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "set-spreadsheet-locale";
      readonly spreadsheet: SpreadsheetReference;
      readonly locale: string;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "set-spreadsheet-time-zone";
      readonly spreadsheet: SpreadsheetReference;
      readonly timeZone: string;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "list-sheets";
      readonly spreadsheet: SpreadsheetReference;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "delete-sheet";
      readonly spreadsheet: SpreadsheetReference;
      readonly sheet: SheetReference;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-sheet";
      readonly spreadsheet: SpreadsheetReference;
      readonly sheetId: number;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-sheet-by-name";
      readonly spreadsheet: SpreadsheetReference;
      readonly name: string;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-sheet-metadata";
      readonly sheet: SheetReference;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "delete-sheet-columns";
      readonly sheet: SheetReference;
      readonly startColumn: number;
      readonly numColumns: number;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "delete-sheet-rows";
      readonly sheet: SheetReference;
      readonly startRow: number;
      readonly numRows: number;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "insert-sheet-columns";
      readonly sheet: SheetReference;
      readonly startColumn: number;
      readonly numColumns: number;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "insert-sheet-rows";
      readonly sheet: SheetReference;
      readonly startRow: number;
      readonly numRows: number;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "move-sheet-columns";
      readonly sheet: SheetReference;
      readonly sourceStart: number;
      readonly sourceCount: number;
      readonly destinationIndex: number;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "move-sheet-rows";
      readonly sheet: SheetReference;
      readonly sourceStart: number;
      readonly sourceCount: number;
      readonly destinationIndex: number;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-sheet-column-hidden-by-user";
      readonly sheet: SheetReference;
      readonly column: number;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-sheet-row-hidden-by-user";
      readonly sheet: SheetReference;
      readonly row: number;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "rename-sheet";
      readonly sheet: SheetReference;
      readonly name: string;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "set-sheet-columns-hidden";
      readonly sheet: SheetReference;
      readonly startColumn: number;
      readonly numColumns: number;
      readonly hidden: boolean;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "set-sheet-rows-hidden";
      readonly sheet: SheetReference;
      readonly startRow: number;
      readonly numRows: number;
      readonly hidden: boolean;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "set-sheet-frozen-columns";
      readonly sheet: SheetReference;
      readonly columns: number;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "set-sheet-frozen-rows";
      readonly sheet: SheetReference;
      readonly rows: number;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "set-sheet-hidden";
      readonly sheet: SheetReference;
      readonly hidden: boolean;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "set-sheet-hidden-gridlines";
      readonly sheet: SheetReference;
      readonly hidden: boolean;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "set-sheet-right-to-left";
      readonly sheet: SheetReference;
      readonly rightToLeft: boolean;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "set-sheet-tab-color";
      readonly sheet: SheetReference;
      readonly tabColor: string | null;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "clear-sheet-notes";
      readonly sheet: SheetReference;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-sheet-data-bounds";
      readonly sheet: SheetReference;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-range-notes";
      readonly range: RangeReference;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-range-values";
      readonly range: RangeReference;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "set-range-notes";
      readonly range: RangeReference;
      readonly notes: SpreadsheetNoteGrid;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "set-range-values";
      readonly range: RangeReference;
      readonly values: SpreadsheetGrid;
    };

type SpreadsheetHostCallResultMap = {
  "create-spreadsheet": SpreadsheetReference;
  "get-spreadsheet": SpreadsheetReference;
  "get-spreadsheet-by-url": SpreadsheetReference;
  "get-spreadsheet-url": string;
  "get-spreadsheet-metadata": SpreadsheetMetadata;
  "get-spreadsheet-locale": string;
  "get-spreadsheet-time-zone": string;
  "rename-spreadsheet": void;
  "set-spreadsheet-locale": void;
  "set-spreadsheet-time-zone": void;
  "list-sheets": readonly SheetReference[];
  "delete-sheet": void;
  "get-sheet": SheetReference | null;
  "get-sheet-by-name": SheetReference | null;
  "get-sheet-metadata": SheetMetadata;
  "delete-sheet-columns": void;
  "delete-sheet-rows": void;
  "insert-sheet-columns": void;
  "insert-sheet-rows": void;
  "move-sheet-columns": void;
  "move-sheet-rows": void;
  "get-sheet-column-hidden-by-user": boolean;
  "get-sheet-row-hidden-by-user": boolean;
  "rename-sheet": void;
  "set-sheet-columns-hidden": void;
  "set-sheet-rows-hidden": void;
  "set-sheet-frozen-columns": void;
  "set-sheet-frozen-rows": void;
  "set-sheet-hidden": void;
  "set-sheet-hidden-gridlines": void;
  "set-sheet-right-to-left": void;
  "set-sheet-tab-color": void;
  "clear-sheet-notes": void;
  "get-sheet-data-bounds": SheetDataBounds;
  "get-range-notes": SpreadsheetNoteGrid;
  "get-range-values": SpreadsheetGrid;
  "set-range-notes": void;
  "set-range-values": void;
};

export type SpreadsheetHostCallResult<C extends SpreadsheetHostCall> =
  SpreadsheetHostCallResultMap[C["operation"]];
