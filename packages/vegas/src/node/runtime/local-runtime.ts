import type { RuntimeBackend } from "./executor";
import type { SpreadsheetStore } from "./spreadsheet-store";

export interface LocalRuntimeResources {
  readonly spreadsheets: SpreadsheetStore;
}

export interface LocalRuntime extends RuntimeBackend {
  readonly resources: LocalRuntimeResources;
}
