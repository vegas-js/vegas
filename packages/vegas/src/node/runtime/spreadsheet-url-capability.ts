import type { SpreadsheetReference } from "./spreadsheet-reference";

export interface SpreadsheetUrlCapability {
  getSpreadsheetUrl(spreadsheet: SpreadsheetReference): string;
  getSpreadsheetIdByUrl(url: string): string | undefined;
}
