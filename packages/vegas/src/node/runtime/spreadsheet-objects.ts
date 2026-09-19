import type { HostBridge } from "./host-bridge";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { Spreadsheet } from "./spreadsheet-spreadsheet";
import { assertPositiveInteger } from "./spreadsheet-validation";

export { Range } from "./spreadsheet-range";
export { Sheet } from "./spreadsheet-sheet";
export { Spreadsheet } from "./spreadsheet-spreadsheet";

type SpreadsheetFile = Pick<GoogleAppsScript.Drive.File, "getId">;

function extractSpreadsheetIdFromUrl(url: string): string {
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const spreadsheetsIndex = segments.indexOf("spreadsheets");
  const idMarkerIndex = segments.indexOf("d", spreadsheetsIndex + 1);
  const id = idMarkerIndex < 0 ? undefined : segments[idMarkerIndex + 1];

  if (parsed.hostname !== "docs.google.com" || spreadsheetsIndex < 0 || !id) {
    throw new Error("Invalid Spreadsheet URL.");
  }

  return id;
}

// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app
export class SpreadsheetApp {
  readonly #bridge: HostBridge;
  readonly #hydrator: SpreadsheetObjectHydrator;

  constructor(bridge: HostBridge, hydrator: SpreadsheetObjectHydrator) {
    this.#bridge = bridge;
    this.#hydrator = hydrator;
  }

  create(name: string, rows: number, columns: number): Spreadsheet {
    assertPositiveInteger(rows, "Spreadsheet rows");
    assertPositiveInteger(columns, "Spreadsheet columns");

    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "spreadsheet",
        operation: "create-spreadsheet",
        name,
        rows,
        columns,
      }),
    );
  }

  enableAllDataSourcesExecution(): void {
    return;
  }

  enableBigQueryExecution(): void {
    return;
  }

  enableLookerExecution(): void {
    return;
  }

  flush(): void {
    return;
  }

  open(file: SpreadsheetFile): Spreadsheet {
    return this.openById(file.getId());
  }

  openByUrl(url: string): Spreadsheet {
    return this.openById(extractSpreadsheetIdFromUrl(url));
  }

  openById(id: string): Spreadsheet {
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "spreadsheet",
        operation: "get-spreadsheet",
        id,
      }),
    );
  }
}
