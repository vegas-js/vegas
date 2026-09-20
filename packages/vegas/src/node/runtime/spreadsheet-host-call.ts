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
      readonly operation: "get-spreadsheet-metadata";
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
      readonly operation: "list-sheets";
      readonly spreadsheet: SpreadsheetReference;
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
  "get-spreadsheet-metadata": SpreadsheetMetadata;
  "rename-spreadsheet": void;
  "list-sheets": readonly SheetReference[];
  "get-sheet": SheetReference | null;
  "get-sheet-by-name": SheetReference | null;
  "get-sheet-metadata": SheetMetadata;
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
