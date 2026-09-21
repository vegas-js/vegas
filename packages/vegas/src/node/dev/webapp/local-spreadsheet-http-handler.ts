import type { Connect } from "vite";

import type {
  SheetReference,
  SpreadsheetGrid,
  SpreadsheetReference,
  SpreadsheetStore,
} from "../../runtime";
import {
  createLocalSpreadsheetHtml,
  type LocalSpreadsheetPage,
  type LocalSpreadsheetSheetPage,
} from "./local-spreadsheet-html";

const LOCAL_SPREADSHEET_PAGE_PATH_PREFIX = "/__vegas/spreadsheets/";
const LOCAL_SPREADSHEET_API_PATH_PREFIX = "/__vegas/api/spreadsheets/";

interface LocalSpreadsheetHttpHandlerOptions {
  readonly getSpreadsheetStore: () => SpreadsheetStore;
}

interface LocalSpreadsheetRoute {
  readonly kind: "page" | "api";
  readonly spreadsheetId: string;
}

function parseSpreadsheetId(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const encodedId = pathname.slice(prefix.length);

  if (encodedId.length === 0 || encodedId.includes("/")) {
    return null;
  }

  try {
    return decodeURIComponent(encodedId);
  } catch {
    return null;
  }
}

function parseSpreadsheetRoute(pathname: string): LocalSpreadsheetRoute | null {
  const apiSpreadsheetId = parseSpreadsheetId(pathname, LOCAL_SPREADSHEET_API_PATH_PREFIX);
  if (apiSpreadsheetId !== null) {
    return {
      kind: "api",
      spreadsheetId: apiSpreadsheetId,
    };
  }

  const pageSpreadsheetId = parseSpreadsheetId(pathname, LOCAL_SPREADSHEET_PAGE_PATH_PREFIX);
  if (pageSpreadsheetId !== null) {
    return {
      kind: "page",
      spreadsheetId: pageSpreadsheetId,
    };
  }

  return null;
}

async function readSpreadsheetSummary(store: SpreadsheetStore, spreadsheet: SpreadsheetReference) {
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

  return {
    id: spreadsheet.id,
    name: metadata.name,
    sheets: sheetSummaries,
  };
}

function parseRequestedSheetId(url: URL): number | undefined {
  const value = url.searchParams.get("sheet");

  if (value === null || !/^-?\d+$/.test(value)) {
    return undefined;
  }

  const sheetId = Number(value);
  return Number.isSafeInteger(sheetId) ? sheetId : undefined;
}

async function readSheetValues(
  store: SpreadsheetStore,
  sheet: SheetReference,
): Promise<SpreadsheetGrid> {
  const bounds = await store.getSheetDataBounds(sheet);

  if (bounds.lastRow === null || bounds.lastColumn === null) {
    return [];
  }

  return store.getRangeValues({
    service: "spreadsheet",
    kind: "range",
    spreadsheetId: sheet.spreadsheetId,
    sheetId: sheet.sheetId,
    row: 1,
    column: 1,
    numRows: bounds.lastRow,
    numColumns: bounds.lastColumn,
  });
}

async function readSpreadsheetPage(
  store: SpreadsheetStore,
  spreadsheet: SpreadsheetReference,
  requestedSheetId: number | undefined,
): Promise<LocalSpreadsheetPage> {
  const metadata = await store.getSpreadsheetMetadata(spreadsheet);
  const sheets = await store.listSheets(spreadsheet);
  const sheetPages = await Promise.all(
    sheets.map(async (sheet) => {
      const sheetMetadata = await store.getSheetMetadata(sheet);

      return {
        reference: sheet,
        name: sheetMetadata.name,
      };
    }),
  );

  const selected =
    requestedSheetId === undefined
      ? sheetPages[0]
      : sheetPages.find(({ reference }) => reference.sheetId === requestedSheetId);

  let activeSheet: LocalSpreadsheetSheetPage | null = null;

  if (selected !== undefined) {
    activeSheet = {
      id: selected.reference.sheetId,
      name: selected.name,
      values: await readSheetValues(store, selected.reference),
    };
  }

  return {
    id: spreadsheet.id,
    name: metadata.name,
    sheets: sheetPages.map(({ reference, name }) => ({
      id: reference.sheetId,
      name,
    })),
    activeSheet,
  };
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
    const route = parseSpreadsheetRoute(url.pathname);

    if (route === null) {
      next();
      return;
    }

    try {
      const store = options.getSpreadsheetStore();
      const spreadsheet = await store.getSpreadsheet(route.spreadsheetId);

      response.statusCode = 200;

      if (route.kind === "api") {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(JSON.stringify(await readSpreadsheetSummary(store, spreadsheet)));
        return;
      }

      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(
        createLocalSpreadsheetHtml(
          await readSpreadsheetPage(store, spreadsheet, parseRequestedSheetId(url)),
        ),
      );
    } catch (error) {
      next(error);
    }
  };
}
