import type { HostBridge } from "./host-bridge";
import { SpreadsheetApp } from "./spreadsheet-app";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import { Range } from "./spreadsheet-range";
import type {
  RangeReference,
  SheetReference,
  SpreadsheetObjectReference,
  SpreadsheetReference,
} from "./spreadsheet-reference";
import { Sheet } from "./spreadsheet-sheet";
import { Spreadsheet } from "./spreadsheet-spreadsheet";

class RuntimeSpreadsheetObjectHydrator implements SpreadsheetObjectHydrator {
  readonly #bridge: HostBridge;

  constructor(bridge: HostBridge) {
    this.#bridge = bridge;
  }

  hydrate(reference: SpreadsheetReference): Spreadsheet;
  hydrate(reference: SheetReference): Sheet;
  hydrate(reference: RangeReference): Range;
  hydrate(reference: SpreadsheetObjectReference): Spreadsheet | Sheet | Range {
    switch (reference.kind) {
      case "spreadsheet": {
        return new Spreadsheet(this.#bridge, reference, this);
      }
      case "sheet": {
        return new Sheet(this.#bridge, reference, this);
      }
      case "range": {
        return new Range(this.#bridge, reference, this);
      }
    }
  }
}

export function createSpreadsheetObjectHydrator(bridge: HostBridge): SpreadsheetObjectHydrator {
  return new RuntimeSpreadsheetObjectHydrator(bridge);
}

export function createSpreadsheetApp(bridge: HostBridge): SpreadsheetApp {
  return new SpreadsheetApp(bridge, createSpreadsheetObjectHydrator(bridge));
}
