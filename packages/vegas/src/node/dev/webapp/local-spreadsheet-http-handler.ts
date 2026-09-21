import type { Connect } from "vite";

import type { SpreadsheetStore } from "../../runtime";

const LOCAL_SPREADSHEET_PATH_PREFIX = "/__vegas/spreadsheets/";

interface LocalSpreadsheetHttpHandlerOptions {
  readonly getSpreadsheetStore: () => SpreadsheetStore;
}

function parseSpreadsheetId(pathname: string): string | null {
  if (!pathname.startsWith(LOCAL_SPREADSHEET_PATH_PREFIX)) {
    return null;
  }

  const encodedId = pathname.slice(LOCAL_SPREADSHEET_PATH_PREFIX.length);

  if (encodedId.length === 0 || encodedId.includes("/")) {
    return null;
  }

  try {
    return decodeURIComponent(encodedId);
  } catch {
    return null;
  }
}

export function createLocalSpreadsheetHttpHandler(
  options: LocalSpreadsheetHttpHandlerOptions,
): Connect.NextHandleFunction {
  return async (request, response, next) => {
    if (request.method !== "GET" || request.url === undefined) {
      next();
      return;
    }

    const url = new URL(request.url, "http://localhost");
    const spreadsheetId = parseSpreadsheetId(url.pathname);

    if (spreadsheetId === null) {
      next();
      return;
    }

    try {
      const store = options.getSpreadsheetStore();
      const spreadsheet = await store.getSpreadsheet(spreadsheetId);
      const metadata = await store.getSpreadsheetMetadata(spreadsheet);
      const sheets = await store.listSheets(spreadsheet);
      const sheetSummaries = await Promise.all(
        sheets.map(async (sheet) => {
          const sheetMetadata = await store.getSheetMetadata(sheet);

          return {
            id: sheet.sheetId,
            name: sheetMetadata.name,
            maxRows: sheetMetadata.maxRows,
            maxColumns: sheetMetadata.maxColumns,
          };
        }),
      );

      response.statusCode = 200;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(
        JSON.stringify({
          id: spreadsheet.id,
          name: metadata.name,
          sheets: sheetSummaries,
        }),
      );
    } catch (error) {
      next(error);
    }
  };
}
