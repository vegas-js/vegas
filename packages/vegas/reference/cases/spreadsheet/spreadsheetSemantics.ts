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

function captureSpreadsheetAppCall(fn: () => unknown) {
  try {
    const value = fn();

    return {
      threw: false,
      type: typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      threw: true,
      type: null,
      isNull: null,
      isUndefined: null,
      ...describeError(error),
    };
  }
}

function captureSpreadsheetOpen(fn: () => unknown, expectedId?: string) {
  try {
    const value = fn();

    const hasGetId =
      value !== null &&
      value !== undefined &&
      typeof (
        value as {
          getId?: unknown;
        }
      ).getId === "function";

    const id = hasGetId
      ? (
          value as {
            getId(): unknown;
          }
        ).getId()
      : null;

    return {
      threw: false,
      type: typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      stringify: value === null || value === undefined ? null : String(value as any),
      hasGetId,
      idType: hasGetId ? typeof id : null,
      idMatchesExpected: expectedId === undefined ? null : id === expectedId,
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      threw: true,
      type: null,
      isNull: null,
      isUndefined: null,
      stringify: null,
      hasGetId: null,
      idType: null,
      idMatchesExpected: null,
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

function resolveReusableReferenceSpreadsheetId(globals: Record<string, any>): string {
  const vegasFallbackId = "vegas-reference-existing-spreadsheet";

  try {
    const queries = [
      "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = true and title contains 'vegas-reference-'",
      "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false and title contains 'vegas-reference-'",
    ];

    for (const query of queries) {
      const files = globals.DriveApp.searchFiles(query);

      if (files.hasNext()) {
        const file = files.next();

        return file.getId();
      }
    }

    throw new Error("Expected an existing vegas reference spreadsheet");
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
     * Vegas intentionally does not expose
     * reachable Drive File objects yet.
     *
     * Its SpreadsheetApp.openById/openByUrl
     * paths can still be characterized using
     * a deterministic synthetic spreadsheet ID.
     */
    if (message === "Method not implemented.") {
      return vegasFallbackId;
    }

    throw error;
  }
}

export function captureReferenceSheetNamedRangeSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const spreadsheetId = resolveReusableReferenceSpreadsheetId(globals);

  const spreadsheet = globals.SpreadsheetApp.openById(spreadsheetId);

  const sheet = spreadsheet.getSheetById(0);

  if (sheet === null || sheet === undefined) {
    throw new Error("Expected reusable spreadsheet to contain sheet id 0");
  }

  const sheetName = sheet.getSheetName();

  return {
    sameSheet: captureRange(() => sheet.getRange(`${sheetName}!B2:C3`), {
      firstCell: [1, 1],
      lastCell: [2, 2],
      rowOverflow: [3, 1],
      columnOverflow: [1, 3],
    }),

    singleCell: captureRange(() => sheet.getRange(`${sheetName}!A1`), {
      firstCell: [1, 1],
      rowOverflow: [2, 1],
      columnOverflow: [1, 2],
    }),

    missingSheet: captureRange(() => sheet.getRange("__vegas_missing_sheet__!A1"), {}),
  };
}

export function captureReferenceSpreadsheetOpenSemantics() {
  const globals = globalThis as unknown as Record<string, any>;

  const spreadsheetApp = globals.SpreadsheetApp;

  const spreadsheetId = resolveReusableReferenceSpreadsheetId(globals);

  const canonicalUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const canonicalUrlWithGid = `${canonicalUrl}#gid=0`;

  const openByIdA = spreadsheetApp.openById(spreadsheetId);

  const openByIdB = spreadsheetApp.openById(spreadsheetId);

  const openByUrl = spreadsheetApp.openByUrl(canonicalUrl);

  const openByUrlWithGid = spreadsheetApp.openByUrl(canonicalUrlWithGid);

  let fileLikeGetIdCalls = 0;

  const fileLike = {
    getId() {
      fileLikeGetIdCalls++;

      return spreadsheetId;
    },
  };

  return {
    flush: captureSpreadsheetAppCall(() => spreadsheetApp.flush()),

    valid: {
      openById: captureSpreadsheetOpen(() => openByIdA, spreadsheetId),

      openByUrl: captureSpreadsheetOpen(() => openByUrl, spreadsheetId),

      openByUrlWithGid: captureSpreadsheetOpen(() => openByUrlWithGid, spreadsheetId),

      identity: {
        repeatedOpenByIdSameObject: openByIdA === openByIdB,

        openByUrlSameAsOpenById: openByUrl === openByIdA,

        openByUrlWithGidSameAsOpenByUrl: openByUrlWithGid === openByUrl,
      },
    },

    fileLikeArgument: {
      call: captureSpreadsheetOpen(() => spreadsheetApp.open(fileLike), spreadsheetId),

      getIdCallCount: fileLikeGetIdCalls,
    },

    invalid: {
      openByIdMissing: captureSpreadsheetOpen(() =>
        spreadsheetApp.openById("vegas-reference-missing-spreadsheet-id"),
      ),

      openByIdEmpty: captureSpreadsheetOpen(() => spreadsheetApp.openById("")),

      openByIdNoArgument: captureSpreadsheetOpen(() =>
        Reflect.apply(spreadsheetApp.openById, spreadsheetApp, []),
      ),

      openNoArgument: captureSpreadsheetOpen(() =>
        Reflect.apply(spreadsheetApp.open, spreadsheetApp, []),
      ),

      openByUrlMalformed: captureSpreadsheetOpen(() => spreadsheetApp.openByUrl("not-a-url")),

      openByUrlNoArgument: captureSpreadsheetOpen(() =>
        Reflect.apply(spreadsheetApp.openByUrl, spreadsheetApp, []),
      ),
    },
  };
}
