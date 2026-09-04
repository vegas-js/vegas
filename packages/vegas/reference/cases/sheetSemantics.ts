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

function captureRead(fn: () => unknown) {
  try {
    const value = fn();

    return {
      threw: false,
      value: value === undefined ? null : value,
      isNull: value === null,
      isUndefined: value === undefined,
      type: typeof value,
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      threw: true,
      value: null,
      isNull: null,
      isUndefined: null,
      type: null,
      ...describeError(error),
    };
  }
}

function captureMutation(receiver: unknown, fn: () => unknown) {
  try {
    const value = fn();

    return {
      threw: false,
      returnsReceiver: value === receiver,
      isNull: value === null,
      isUndefined: value === undefined,
      type: typeof value,
      stringify: value === null || value === undefined ? null : String(value as any),
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      threw: true,
      returnsReceiver: null,
      isNull: null,
      isUndefined: null,
      type: null,
      stringify: null,
      ...describeError(error),
    };
  }
}

function cleanupSpreadsheet(globals: Record<string, any>, spreadsheet: any) {
  try {
    globals.DriveApp.getFileById(spreadsheet.getId()).setTrashed(true);
  } catch (error) {
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

    /*
     * Reachable Drive File objects are not implemented in Vegas yet.
     * Real GAS cleanup failures must still fail reference acquisition.
     */
    if (message === "Method not implemented.") {
      return;
    }

    throw error;
  }
}

function createReferenceSheet(
  globals: Record<string, any>,
  suffix: string,
  rows: number,
  columns: number,
) {
  const spreadsheet = globals.SpreadsheetApp.create(
    `vegas-reference-${suffix}-${Date.now()}`,
    rows,
    columns,
  );

  const sheet = spreadsheet.getSheetById(0);

  if (sheet === null || sheet === undefined) {
    cleanupSpreadsheet(globals, spreadsheet);
    throw new Error("Expected initial spreadsheet sheet");
  }

  return {
    spreadsheet,
    sheet,
  };
}

function captureSheetScalars(sheet: any) {
  return {
    sheetId: sheet.getSheetId(),
    sheetName: sheet.getSheetName(),
    lastRow: sheet.getLastRow(),
    lastColumn: sheet.getLastColumn(),
    maxRows: sheet.getMaxRows(),
    maxColumns: sheet.getMaxColumns(),
  };
}

function captureSheetState(sheet: any) {
  const maxRows = sheet.getMaxRows();
  const maxColumns = sheet.getMaxColumns();

  return {
    scalars: captureSheetScalars(sheet),
    values: sheet.getSheetValues(1, 1, maxRows, maxColumns),
  };
}

function createSeedValues(rows: number, columns: number) {
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: columns }, (_, columnIndex) => `r${rowIndex + 1}c${columnIndex + 1}`),
  );
}

export function captureReferenceSheetQuerySemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const { spreadsheet, sheet } = createReferenceSheet(globals, "sheet-query", 6, 7);

  try {
    const initial = captureSheetScalars(sheet);

    sheet.getRange("B2:D4").setValues([
      ["b2", "c2", "d2"],
      ["b3", "c3", "d3"],
      ["b4", "c4", "d4"],
    ]);

    const afterWrite = captureSheetScalars(sheet);

    return {
      initial,
      afterWrite,

      normalRead: captureRead(() => sheet.getSheetValues(2, 2, 2, 3)),

      negativeRows: captureRead(() => sheet.getSheetValues(2, 2, -1, 3)),

      negativeColumns: captureRead(() => sheet.getSheetValues(2, 2, 3, -1)),

      negativeRowsAndColumns: captureRead(() => sheet.getSheetValues(2, 2, -1, -1)),

      zeroStartRow: captureRead(() => sheet.getSheetValues(0, 1, 1, 1)),

      zeroStartColumn: captureRead(() => sheet.getSheetValues(1, 0, 1, 1)),

      zeroRows: captureRead(() => sheet.getSheetValues(1, 1, 0, 1)),

      zeroColumns: captureRead(() => sheet.getSheetValues(1, 1, 1, 0)),
    };
  } finally {
    cleanupSpreadsheet(globals, spreadsheet);
  }
}

export function captureReferenceSheetClearContentsSemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const { spreadsheet, sheet } = createReferenceSheet(globals, "sheet-clear-contents", 4, 5);

  try {
    sheet.getRange("B2:D3").setValues([
      ["b2", "c2", "d2"],
      ["b3", "c3", "d3"],
    ]);

    const before = captureSheetState(sheet);

    const mutation = captureMutation(sheet, () => sheet.clearContents());

    const after = captureSheetState(sheet);

    return {
      before,
      mutation,
      after,
    };
  } finally {
    cleanupSpreadsheet(globals, spreadsheet);
  }
}

function captureDeleteScenario(
  globals: Record<string, any>,
  suffix: string,
  mutate: (sheet: any) => unknown,
) {
  const { spreadsheet, sheet } = createReferenceSheet(globals, suffix, 5, 5);

  try {
    sheet.getRange(1, 1, 5, 5).setValues(createSeedValues(5, 5));

    const before = captureSheetState(sheet);

    const mutation = captureMutation(sheet, () => mutate(sheet));

    const after = captureSheetState(sheet);

    return {
      before,
      mutation,
      after,
    };
  } finally {
    cleanupSpreadsheet(globals, spreadsheet);
  }
}

export function captureReferenceSheetDeleteSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  return {
    deleteFirstRow: captureDeleteScenario(globals, "sheet-delete-first-row", (sheet) =>
      sheet.deleteRow(1),
    ),

    deleteRows: captureDeleteScenario(globals, "sheet-delete-rows", (sheet) =>
      sheet.deleteRows(2, 2),
    ),

    deleteFirstColumn: captureDeleteScenario(globals, "sheet-delete-first-column", (sheet) =>
      sheet.deleteColumn(1),
    ),

    deleteColumns: captureDeleteScenario(globals, "sheet-delete-columns", (sheet) =>
      sheet.deleteColumns(2, 2),
    ),
  };
}
