function describeError(error: unknown) {
  const candidate = error as {
    name?: unknown;
    message?: unknown;
  } | null;

  return {
    errorName: typeof candidate?.name === "string" ? candidate.name : typeof error,
    errorMessage: typeof candidate?.message === "string" ? candidate.message : String(error),
  };
}

function cleanupSpreadsheet(globals: Record<string, any>, spreadsheet: any) {
  try {
    globals.DriveApp.getFileById(spreadsheet.getId()).setTrashed(true);
  } catch (error) {
    /*
     * Vegas does not expose reachable Drive File objects yet.
     *
     * Ignore only that known Vegas limitation. Cleanup failures against
     * real GAS must remain visible to reference acquisition.
     */
    const message =
      error !== null && typeof error === "object" && "message" in error
        ? String(
            (
              error as {
                message?: unknown;
              }
            ).message,
          )
        : "";

    if (message === "Method not implemented.") {
      return;
    }

    throw error;
  }
}

function requireInitialSheet(spreadsheet: any) {
  const sheet = spreadsheet.getSheetById(0);

  if (sheet === null || sheet === undefined) {
    throw new Error("Expected getSheetById(0) to return the initial sheet");
  }

  return sheet;
}

function captureSheetLookup(fn: () => unknown) {
  try {
    const value = fn();

    const sheetId =
      value !== null &&
      value !== undefined &&
      typeof (value as { getSheetId?: unknown }).getSheetId === "function"
        ? (value as { getSheetId(): unknown }).getSheetId()
        : null;

    return {
      threw: false,
      isNull: value === null,
      isUndefined: value === undefined,
      type: typeof value,
      stringify: value === null || value === undefined ? null : String(value as any),
      sheetId,
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      threw: true,
      isNull: null,
      isUndefined: null,
      type: null,
      stringify: null,
      sheetId: null,
      ...describeError(error),
    };
  }
}

function canGetCell(range: any, row: number, column: number) {
  try {
    range.getCell(row, column);
    return true;
  } catch {
    return false;
  }
}

function captureRange(
  fn: () => unknown,
  probes: Readonly<Record<string, readonly [number, number]>>,
) {
  try {
    const range = fn();

    return {
      threw: false,
      type: typeof range,
      stringify: String(range),
      probes: Object.fromEntries(
        Object.entries(probes).map(([name, [row, column]]) => [
          name,
          canGetCell(range, row, column),
        ]),
      ),
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      threw: true,
      type: null,
      stringify: null,
      probes: null,
      ...describeError(error),
    };
  }
}

export function captureReferenceSpreadsheetCreateSemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const spreadsheets: any[] = [];

  try {
    const defaultSpreadsheet = globals.SpreadsheetApp.create(
      `vegas-reference-default-${Date.now()}`,
    );

    spreadsheets.push(defaultSpreadsheet);

    const explicitSpreadsheet = globals.SpreadsheetApp.create(
      `vegas-reference-explicit-${Date.now()}`,
      7,
      9,
    );

    spreadsheets.push(explicitSpreadsheet);

    const defaultSheet = requireInitialSheet(defaultSpreadsheet);
    const explicitSheet = requireInitialSheet(explicitSpreadsheet);

    const defaultSpreadsheetId = defaultSpreadsheet.getId();
    const explicitSpreadsheetId = explicitSpreadsheet.getId();

    return {
      defaultCreate: {
        spreadsheetIdType: typeof defaultSpreadsheetId,
        spreadsheetIdNonEmpty:
          typeof defaultSpreadsheetId === "string" && defaultSpreadsheetId.length > 0,

        initialSheetId: defaultSheet.getSheetId(),
        initialSheetName: defaultSheet.getSheetName(),

        maxRows: defaultSheet.getMaxRows(),
        maxColumns: defaultSheet.getMaxColumns(),
      },

      explicitCreate: {
        spreadsheetIdType: typeof explicitSpreadsheetId,
        spreadsheetIdNonEmpty:
          typeof explicitSpreadsheetId === "string" && explicitSpreadsheetId.length > 0,

        initialSheetId: explicitSheet.getSheetId(),
        initialSheetName: explicitSheet.getSheetName(),

        maxRows: explicitSheet.getMaxRows(),
        maxColumns: explicitSheet.getMaxColumns(),
      },

      distinctSpreadsheetIds: defaultSpreadsheetId !== explicitSpreadsheetId,
    };
  } finally {
    for (const spreadsheet of spreadsheets) {
      cleanupSpreadsheet(globals, spreadsheet);
    }
  }
}

export function captureReferenceSpreadsheetGetSheetByIdSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const spreadsheet = globals.SpreadsheetApp.create(`vegas-reference-sheet-id-${Date.now()}`, 6, 7);

  try {
    return {
      initialSheet: captureSheetLookup(() => spreadsheet.getSheetById(0)),

      missingSheet: captureSheetLookup(() => spreadsheet.getSheetById(2_147_483_647)),
    };
  } finally {
    cleanupSpreadsheet(globals, spreadsheet);
  }
}

export function captureReferenceSheetGetRangeSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const spreadsheet = globals.SpreadsheetApp.create(`vegas-reference-range-${Date.now()}`, 6, 7);

  try {
    const sheet = requireInitialSheet(spreadsheet);

    return {
      numericTwoArguments: captureRange(() => sheet.getRange(2, 3), {
        cell11: [1, 1],
        rowOverflow: [2, 1],
        columnOverflow: [1, 2],
      }),

      numericThreeArguments: captureRange(() => sheet.getRange(2, 3, 2), {
        cell11: [1, 1],
        lastCell: [2, 1],
        rowOverflow: [3, 1],
        columnOverflow: [1, 2],
      }),

      numericFourArguments: captureRange(() => sheet.getRange(2, 3, 2, 3), {
        cell11: [1, 1],
        lastCell: [2, 3],
        rowOverflow: [3, 1],
        columnOverflow: [1, 4],
      }),

      a1SingleCell: captureRange(() => sheet.getRange("C4"), {
        cell11: [1, 1],
        rowOverflow: [2, 1],
        columnOverflow: [1, 2],
      }),

      a1Block: captureRange(() => sheet.getRange("B2:D3"), {
        cell11: [1, 1],
        lastCell: [2, 3],
        rowOverflow: [3, 1],
        columnOverflow: [1, 4],
      }),

      a1WholeColumn: captureRange(() => sheet.getRange("B:B"), {
        firstCell: [1, 1],
        lastRow: [6, 1],
        rowOverflow: [7, 1],
        columnOverflow: [1, 2],
      }),

      a1WholeRow: captureRange(() => sheet.getRange("2:2"), {
        firstCell: [1, 1],
        lastColumn: [1, 7],
        rowOverflow: [2, 1],
        columnOverflow: [1, 8],
      }),

      zeroRow: captureRange(() => sheet.getRange(0, 1), {}),

      zeroColumn: captureRange(() => sheet.getRange(1, 0), {}),

      zeroNumRows: captureRange(() => sheet.getRange(1, 1, 0, 1), {}),

      zeroNumColumns: captureRange(() => sheet.getRange(1, 1, 1, 0), {}),

      invalidA1: captureRange(() => sheet.getRange("not-a-range"), {}),
    };
  } finally {
    cleanupSpreadsheet(globals, spreadsheet);
  }
}
