import type { HostBridge } from "./host-bridge";
import type { SpreadsheetObjectHydrator } from "./spreadsheet-hydrator";
import type { SpreadsheetReference } from "./spreadsheet-reference";
import type { Sheet } from "./spreadsheet-sheet";
import { assertInteger } from "./spreadsheet-validation";

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

  deleteSheet(sheet: Sheet): void {
    const parent = sheet.getParent();

    this.#bridge.call({
      service: "spreadsheet",
      operation: "delete-sheet",
      spreadsheet: this.#reference,
      sheet: {
        service: "spreadsheet",
        kind: "sheet",
        spreadsheetId: parent.getId(),
        sheetId: sheet.getSheetId(),
      },
    });
  }

  getId(): string {
    return this.#reference.id;
  }

  getUrl(): string {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-spreadsheet-url",
      spreadsheet: this.#reference,
    });
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
