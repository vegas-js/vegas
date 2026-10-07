import type { SpreadsheetObjectHydrator } from "./hydrator";
import type { SpreadsheetReference } from "./reference";
import type { HostBridge } from "./runtime-boundary";
import { UnsupportedRuntimeOperationError } from "./runtime-boundary";
import type { Sheet } from "./sheet";
import { assertInteger } from "./validation";

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

  getSpreadsheetLocale(): string {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-spreadsheet-locale",
      spreadsheet: this.#reference,
    });
  }

  getSpreadsheetTimeZone(): string {
    return this.#bridge.call({
      service: "spreadsheet",
      operation: "get-spreadsheet-time-zone",
      spreadsheet: this.#reference,
    });
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

  insertSheet(): Sheet;
  insertSheet(sheetIndex: number): Sheet;
  insertSheet(sheetIndex: number, options: { template?: Sheet | undefined }): Sheet;
  insertSheet(options: { template?: Sheet | undefined }): Sheet;
  insertSheet(sheetName: string): Sheet;
  insertSheet(sheetName: string, sheetIndex: number): Sheet;
  insertSheet(
    sheetName: string,
    sheetIndex: number,
    options: { template?: Sheet | undefined },
  ): Sheet;
  insertSheet(sheetName: string, options: { template?: Sheet | undefined }): Sheet;
  insertSheet(
    sheetNameOrIndexOrOptions?: string | number | { template?: Sheet | undefined },
    sheetIndexOrOptions?: number | { template?: Sheet | undefined },
    options?: { template?: Sheet | undefined },
  ): Sheet {
    let name: string | undefined;
    let index: number | undefined;
    let resolvedOptions: { template?: Sheet | undefined } | undefined;

    if (typeof sheetNameOrIndexOrOptions === "string") {
      name = sheetNameOrIndexOrOptions;

      if (typeof sheetIndexOrOptions === "number") {
        index = sheetIndexOrOptions;
        resolvedOptions = options;
      } else {
        resolvedOptions = sheetIndexOrOptions;
      }
    } else if (typeof sheetNameOrIndexOrOptions === "number") {
      index = sheetNameOrIndexOrOptions;

      if (typeof sheetIndexOrOptions === "number") {
        // Apps Script exposes an options object after the numeric-index overload, but does not
        // document arbitrary runtime values. Vegas rejects another numeric argument explicitly.
        throw new TypeError("Spreadsheet insert sheet options must be an object.");
      }

      resolvedOptions = sheetIndexOrOptions;
    } else {
      resolvedOptions = sheetNameOrIndexOrOptions;
    }

    if (index !== undefined) {
      assertInteger(index, "Spreadsheet sheet index");
    }

    if (resolvedOptions?.template !== undefined) {
      // Apps Script documents that the complete template Sheet data is copied. Vegas does not yet
      // model enough Sheet state to reproduce that contract without silently dropping data.
      throw new UnsupportedRuntimeOperationError(
        "Spreadsheet.insertSheet() with a template",
        "Sheet template cloning is not modeled.",
      );
    }

    const reference = this.#bridge.call({
      service: "spreadsheet",
      operation: "insert-sheet",
      spreadsheet: this.#reference,
      ...(name === undefined ? {} : { name }),
      ...(index === undefined ? {} : { index }),
    });

    // Apps Script also makes the inserted Sheet active. Vegas does not model active-Sheet state
    // yet, so the local Runtime currently models creation and ordering only.
    return this.#hydrator.hydrate(reference);
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

  setSpreadsheetLocale(locale: string): void {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-spreadsheet-locale",
      spreadsheet: this.#reference,
      locale,
    });
  }

  setSpreadsheetTimeZone(timeZone: string): void {
    this.#bridge.call({
      service: "spreadsheet",
      operation: "set-spreadsheet-time-zone",
      spreadsheet: this.#reference,
      timeZone,
    });
  }
}
