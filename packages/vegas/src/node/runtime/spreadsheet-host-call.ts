import type { RangeReference, SheetReference, SpreadsheetReference } from "./spreadsheet-reference";
import type {
  SheetDataBounds,
  SheetMetadata,
  SpreadsheetGrid,
  SpreadsheetMetadata,
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
      readonly operation: "rename-sheet";
      readonly sheet: SheetReference;
      readonly name: string;
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
      readonly operation: "get-sheet-data-bounds";
      readonly sheet: SheetReference;
    }
  | {
      readonly service: "spreadsheet";
      readonly operation: "get-range-values";
      readonly range: RangeReference;
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
  "rename-sheet": void;
  "set-sheet-hidden-gridlines": void;
  "set-sheet-right-to-left": void;
  "get-sheet-data-bounds": SheetDataBounds;
  "get-range-values": SpreadsheetGrid;
  "set-range-values": void;
};

export type SpreadsheetHostCallResult<C extends SpreadsheetHostCall> =
  SpreadsheetHostCallResultMap[C["operation"]];
