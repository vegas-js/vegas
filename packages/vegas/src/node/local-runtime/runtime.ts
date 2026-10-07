import type { RuntimeBackend } from "../runtime/executor";
import type { SpreadsheetStore } from "../runtime/spreadsheet/store";

export interface LocalRuntimeResources {
  readonly spreadsheets: SpreadsheetStore;
}

export interface LocalRuntime extends RuntimeBackend {
  readonly resources: LocalRuntimeResources;
}
