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

function captureCall(fn: () => unknown) {
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

function createReferenceSheet(globals: Record<string, any>, suffix: string) {
  const spreadsheet = globals.SpreadsheetApp.create(
    `vegas-reference-${suffix}-${Date.now()}`,
    6,
    6,
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

export function captureReferenceRangeValueSemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const { spreadsheet, sheet } = createReferenceSheet(globals, "range-values");

  try {
    const emptyCell = sheet.getRange("A1");
    const emptyBlock = sheet.getRange("A1:B2");
    const block = sheet.getRange("B2:C3");

    const before = {
      singleValue: captureCall(() => emptyCell.getValue()),
      blockValues: captureCall(() => emptyBlock.getValues()),
    };

    const setValue = captureMutation(block, () => block.setValue("filled"));

    const afterSetValue = {
      getValue: captureCall(() => block.getValue()),
      getValues: captureCall(() => block.getValues()),
    };

    const setValues = captureMutation(block, () =>
      block.setValues([
        ["a", 2],
        [true, 4],
      ]),
    );

    const afterSetValues = {
      getValue: captureCall(() => block.getValue()),
      getValues: captureCall(() => block.getValues()),
    };

    return {
      before,
      setValue,
      afterSetValue,
      setValues,
      afterSetValues,
    };
  } finally {
    cleanupSpreadsheet(globals, spreadsheet);
  }
}

export function captureReferenceRangeSetValuesValidationSemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const { spreadsheet, sheet } = createReferenceSheet(globals, "range-set-values-validation");

  try {
    const range = sheet.getRange("B2:C3");

    range.setValues([
      ["a", "b"],
      ["c", "d"],
    ]);

    const captureAttempt = (values: unknown[][]) => {
      const result = captureMutation(range, () => range.setValues(values));

      return {
        result,
        valuesAfterCall: captureCall(() => range.getValues()),
      };
    };

    return {
      rowShort: captureAttempt([["x", "y"]]),

      rowLong: captureAttempt([
        ["x", "y"],
        ["z", "w"],
        ["extra-1", "extra-2"],
      ]),

      columnShort: captureAttempt([["x"], ["y"]]),

      columnLong: captureAttempt([
        ["x", "y", "extra-1"],
        ["z", "w", "extra-2"],
      ]),

      ragged: captureAttempt([["x", "y"], ["z"]]),

      empty: captureAttempt([]),
    };
  } finally {
    cleanupSpreadsheet(globals, spreadsheet);
  }
}

function captureCell(range: any, row: number, column: number) {
  try {
    const cell = range.getCell(row, column);

    return {
      threw: false,
      type: typeof cell,
      stringify: String(cell),
      value: cell.getValue(),
      errorName: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      threw: true,
      type: null,
      stringify: null,
      value: null,
      ...describeError(error),
    };
  }
}

export function captureReferenceRangeGetCellSemantics() {
  const globals = globalThis as unknown as Record<string, any>;
  const { spreadsheet, sheet } = createReferenceSheet(globals, "range-get-cell");

  try {
    sheet.getRange("B2").setValue("r1c1");
    sheet.getRange("C2").setValue("r1c2");
    sheet.getRange("B3").setValue("r2c1");
    sheet.getRange("C3").setValue("r2c2");

    const range = sheet.getRange("B2:C3");

    return {
      firstCell: captureCell(range, 1, 1),
      lastCell: captureCell(range, 2, 2),

      zeroRow: captureCell(range, 0, 1),
      zeroColumn: captureCell(range, 1, 0),

      rowOverflow: captureCell(range, 3, 1),
      columnOverflow: captureCell(range, 1, 3),
    };
  } finally {
    cleanupSpreadsheet(globals, spreadsheet);
  }
}
