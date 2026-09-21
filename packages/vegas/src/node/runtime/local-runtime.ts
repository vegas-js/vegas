import type { RuntimeBackend } from "./executor";
import type { SpreadsheetStore } from "./spreadsheet-store";

export interface LocalRuntimeResources {
  readonly spreadsheets: SpreadsheetStore;
}

export interface LocalRuntime {
  readonly backend: RuntimeBackend;
  readonly resources: LocalRuntimeResources;
}
