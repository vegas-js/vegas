import type { SpreadsheetReference } from "../../runtime/spreadsheet-reference";
import type { SpreadsheetUrlCapability } from "../../runtime/spreadsheet-url-capability";

const LOCAL_SPREADSHEET_PAGE_PATH_PREFIX = "/__vegas/spreadsheets/";

export interface LocalSpreadsheetUrlConfiguration {
  setOrigin(origin: string): void;
}

export class LocalSpreadsheetUrlResolver
  implements SpreadsheetUrlCapability, LocalSpreadsheetUrlConfiguration
{
  #origin: string | undefined;

  setOrigin(origin: string): void {
    this.#origin = new URL(origin).origin;
  }

  getSpreadsheetUrl(spreadsheet: SpreadsheetReference): string {
    if (this.#origin === undefined) {
      throw new Error("Local Spreadsheet viewer origin is not configured.");
    }

    // Apps Script documents getUrl() only as returning the Spreadsheet URL. Local Spreadsheet
    // resources have no Google URL, so Vegas returns the local viewer URL served by the dev server.
    return new URL(
      `${LOCAL_SPREADSHEET_PAGE_PATH_PREFIX}${encodeURIComponent(spreadsheet.id)}`,
      `${this.#origin}/`,
    ).href;
  }

  getSpreadsheetIdByUrl(value: string): string | undefined {
    if (this.#origin === undefined) {
      return undefined;
    }

    let url: URL;

    try {
      url = new URL(value);
    } catch {
      return undefined;
    }

    if (
      url.origin !== this.#origin ||
      !url.pathname.startsWith(LOCAL_SPREADSHEET_PAGE_PATH_PREFIX)
    ) {
      return undefined;
    }

    const encodedId = url.pathname.slice(LOCAL_SPREADSHEET_PAGE_PATH_PREFIX.length);

    if (encodedId.length === 0 || encodedId.includes("/")) {
      return undefined;
    }

    try {
      return decodeURIComponent(encodedId);
    } catch {
      return undefined;
    }
  }
}
