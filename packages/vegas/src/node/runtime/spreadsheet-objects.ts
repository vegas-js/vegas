import type { HostBridge } from "./host-bridge";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { SpreadsheetReference } from "./spreadsheet-reference";
import { Sheet } from "./spreadsheet-sheet";
import { assertInteger, assertPositiveInteger } from "./spreadsheet-validation";

export { Range } from "./spreadsheet-range";
export { Sheet };

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

// https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet
export class Spreadsheet {
  readonly #bridge: HostBridge;
  readonly #reference: SpreadsheetReference;
  readonly #hydrator: SpreadsheetObjectHydrator;

  constructor(
    bridge: HostBridge,
    reference: SpreadsheetReference,
    hydrator: SpreadsheetObjectHydrator,
  ) {
    this.#bridge = bridge;
    this.#reference = reference;
    this.#hydrator = hydrator;
  }

  getId(): string {
    return this.#reference.id;
  }

  getName(): string {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-spreadsheet-metadata",
      spreadsheet: this.#reference,
    }).name;
  }

  getNumSheets(): number {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "list-sheets",
      spreadsheet: this.#reference,
    }).length;
  }

  getSheets(): Sheet[] {
    return this.#bridge
      .call({
        service: "spreadsheet",
        operation: "list-sheets",
        spreadsheet: this.#reference,
      })
      .map((reference) => this.#hydrator.hydrate(reference));
  }

  getSheetById(id: number): Sheet | null {
    assertInteger(id, "Spreadsheet sheet id");

    const reference = this.#bridge.call({
      service: "spreadsheet",
      operation: "get-sheet",
      spreadsheet: this.#reference,
      sheetId: id,
    });

    return reference === null ? null : this.#hydrator.hydrate(reference);
  }

  getSheetByName(name: string): Sheet | null {
    const reference = this.#bridge.call({
      service: "spreadsheet",
      operation: "get-sheet-by-name",
      spreadsheet: this.#reference,
      name,
    });

    return reference === null ? null : this.#hydrator.hydrate(reference);
  }

  rename(newName: string): void {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "rename-spreadsheet",
      spreadsheet: this.#reference,
      name: newName,
    });
  }
}
