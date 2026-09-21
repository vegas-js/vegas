import type { HostBridge } from "./host-bridge";
import { SPREADSHEET_SHEET_TYPE } from "./spreadsheet-enum";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { Spreadsheet } from "./spreadsheet-spreadsheet";
import { assertPositiveInteger } from "./spreadsheet-validation";

type SpreadsheetFile = Pick<GoogleAppsScript.Drive.File, "getId">;

// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app
export class SpreadsheetApp {
  readonly #bridge: HostBridge;
  readonly #hydrator: SpreadsheetObjectHydrator;

  readonly SheetType = SPREADSHEET_SHEET_TYPE;

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
    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "spreadsheet",
        operation: "get-spreadsheet-by-url",
        url,
      }),
    );
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
