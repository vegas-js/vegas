import type { Connect } from "vite";

import type {
  SheetReference,
  SpreadsheetGrid,
  SpreadsheetReference,
  SpreadsheetStore,
} from "../../runtime";
import { readRequestBody } from "./http";
import {
  createLocalSpreadsheetHtml,
  type LocalSpreadsheetPage,
  type LocalSpreadsheetSheetPage,
} from "./local-spreadsheet-html";

const LOCAL_SPREADSHEET_PAGE_PATH_PREFIX = "/__vegas/spreadsheets/";
const LOCAL_SPREADSHEET_API_PATH_PREFIX = "/__vegas/api/spreadsheets/";
const LOCAL_SPREADSHEET_MIN_VISIBLE_ROWS = 20;
const LOCAL_SPREADSHEET_MIN_VISIBLE_COLUMNS = 10;

interface LocalSpreadsheetHttpHandlerOptions {
  readonly getSpreadsheetStore: () => SpreadsheetStore;
}

interface LocalSpreadsheetRoute {
  readonly kind: "page" | "api" | "cell";
  readonly spreadsheetId: string;
}

interface LocalSpreadsheetCellUpdate {
  readonly sheetId: number;
  readonly row: number;
  readonly column: number;
  readonly value: string | number | boolean;
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isSpreadsheetCellValue(value: unknown): value is LocalSpreadsheetCellUpdate["value"] {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
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
  const cellSuffix = "/cells";

  if (pathname.startsWith(LOCAL_SPREADSHEET_API_PATH_PREFIX) && pathname.endsWith(cellSuffix)) {
    const spreadsheetId = parseSpreadsheetId(
      pathname.slice(0, -cellSuffix.length),
      LOCAL_SPREADSHEET_API_PATH_PREFIX,
    );

    if (spreadsheetId !== null) {
      return {
        kind: "cell",
        spreadsheetId,
      };
    }
  }

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

function parseCellUpdate(body: string): LocalSpreadsheetCellUpdate {
  let value: unknown;

  try {
    value = JSON.parse(body);
  } catch {
    throw new Error("Invalid local Spreadsheet cell update JSON.");
  }

  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid local Spreadsheet cell update.");
  }

  if (
    !("sheetId" in value) ||
    !isSafeInteger(value.sheetId) ||
    !("row" in value) ||
    !isSafeInteger(value.row) ||
    value.row < 1 ||
    !("column" in value) ||
    !isSafeInteger(value.column) ||
    value.column < 1 ||
    !("value" in value) ||
    !isSpreadsheetCellValue(value.value)
  ) {
    throw new Error("Invalid local Spreadsheet cell update.");
  }

  return {
    sheetId: value.sheetId,
    row: value.row,
    column: value.column,
    value: value.value,
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
  maxRows: number,
  maxColumns: number,
): Promise<SpreadsheetGrid> {
  const bounds = await store.getSheetDataBounds(sheet);

  // The local viewer keeps a small editable viewport for blank Sheets instead of materializing the
  // entire grid, while still expanding far enough to include every populated cell.
  const visibleRows = Math.min(
    maxRows,
    Math.max(bounds.lastRow ?? 0, LOCAL_SPREADSHEET_MIN_VISIBLE_ROWS),
  );
  const visibleColumns = Math.min(
    maxColumns,
    Math.max(bounds.lastColumn ?? 0, LOCAL_SPREADSHEET_MIN_VISIBLE_COLUMNS),
  );

  return store.getRangeValues({
    service: "spreadsheet",
    kind: "range",
    spreadsheetId: sheet.spreadsheetId,
    sheetId: sheet.sheetId,
    row: 1,
    column: 1,
    numRows: visibleRows,
    numColumns: visibleColumns,
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
        maxRows: sheetMetadata.maxRows,
        maxColumns: sheetMetadata.maxColumns,
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
      values: await readSheetValues(
        store,
        selected.reference,
        selected.maxRows,
        selected.maxColumns,
      ),
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
    if (request.url === undefined) {
      next();
      return;
    }

    const url = new URL(request.url, "http://localhost");
    const route = parseSpreadsheetRoute(url.pathname);

    if (route === null) {
      next();
      return;
    }

    if (
      (route.kind === "cell" && request.method !== "PATCH") ||
      (route.kind !== "cell" && request.method !== "GET")
    ) {
      next();
      return;
    }

    try {
      const store = options.getSpreadsheetStore();
      const spreadsheet = await store.getSpreadsheet(route.spreadsheetId);

      if (route.kind === "cell") {
        const update = parseCellUpdate(await readRequestBody(request));

        await store.setRangeValues(
          {
            service: "spreadsheet",
            kind: "range",
            spreadsheetId: spreadsheet.id,
            sheetId: update.sheetId,
            row: update.row,
            column: update.column,
            numRows: 1,
            numColumns: 1,
          },
          [[update.value]],
        );

        response.statusCode = 204;
        response.end();
        return;
      }

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
