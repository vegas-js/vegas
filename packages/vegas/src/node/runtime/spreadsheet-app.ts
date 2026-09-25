import type { HostBridge } from "./host-bridge";
import { SPREADSHEET_DIMENSION, SPREADSHEET_SHEET_TYPE } from "./spreadsheet-enum";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { Spreadsheet } from "./spreadsheet-spreadsheet";
import { assertPositiveInteger } from "./spreadsheet-validation";

type SpreadsheetFile = Pick<GoogleAppsScript.Drive.File, "getId">;

const DEFAULT_LOCAL_SPREADSHEET_ROWS = 1_000;
const DEFAULT_LOCAL_SPREADSHEET_COLUMNS = 26;

// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app
export class SpreadsheetApp {
  readonly #bridge: HostBridge;
  readonly #hydrator: SpreadsheetObjectHydrator;

  readonly Dimension = SPREADSHEET_DIMENSION;
  readonly SheetType = SPREADSHEET_SHEET_TYPE;

  constructor(bridge: HostBridge, hydrator: SpreadsheetObjectHydrator) {
    this.#bridge = bridge;
    this.#hydrator = hydrator;
  }

  create(name: string): Spreadsheet;
  create(name: string, rows: number, columns: number): Spreadsheet;
  create(name: string, rows?: number, columns?: number): Spreadsheet {
    let resolvedRows: number;
    let resolvedColumns: number;

    if (rows === undefined && columns === undefined) {
      // Apps Script documents create(name), but not the default grid dimensions. Vegas uses
      // the standard blank-grid dimensions shown in Google Sheets API examples.
      resolvedRows = DEFAULT_LOCAL_SPREADSHEET_ROWS;
      resolvedColumns = DEFAULT_LOCAL_SPREADSHEET_COLUMNS;
    } else {
      // Apps Script exposes one- and three-argument overloads, but does not document partial
      // dimension calls. Vegas rejects them instead of guessing the missing dimension.
      if (rows === undefined || columns === undefined) {
        throw new TypeError("Spreadsheet rows and columns must be provided together.");
      }

      assertPositiveInteger(rows, "Spreadsheet rows");
      assertPositiveInteger(columns, "Spreadsheet columns");
      resolvedRows = rows;
      resolvedColumns = columns;
    }

    return this.#hydrator.hydrate(
      this.#bridge.call({
        service: "spreadsheet",
        operation: "create-spreadsheet",
        name,
        rows: resolvedRows,
        columns: resolvedColumns,
      }),
    );
  }

  // Apps Script enables external Spreadsheet data-source execution. Vegas does not model
  // Connected Sheets execution, so these local enablement methods are intentional no-ops.
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
    // Apps Script flushes pending Spreadsheet changes. Vegas applies local mutations
    // synchronously, so there is no pending mutation queue to flush.
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
