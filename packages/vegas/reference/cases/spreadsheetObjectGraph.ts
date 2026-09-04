function describeProperties(value: object) {
  return Object.getOwnPropertyNames(value)
    .map((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, name);

      if (!descriptor) {
        throw new Error(`Missing descriptor for ${name}`);
      }

      return {
        name,
        type: "value" in descriptor ? typeof descriptor.value : "accessor",
        configurable: descriptor.configurable ?? false,
        enumerable: descriptor.enumerable ?? false,
        writable: "writable" in descriptor ? (descriptor.writable ?? false) : null,
        getter: typeof descriptor.get === "function",
        setter: typeof descriptor.set === "function",
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function describePropertyOwnership(value: object, name: string) {
  if (Object.prototype.hasOwnProperty.call(value, name)) {
    return {
      owner: "own",
      prototypeDepth: null,
    };
  }

  let prototype = Object.getPrototypeOf(value);

  let depth = 0;

  while (prototype !== null) {
    if (Object.prototype.hasOwnProperty.call(prototype, name)) {
      return {
        owner: "prototype",
        prototypeDepth: depth,
      };
    }

    prototype = Object.getPrototypeOf(prototype);

    depth += 1;
  }

  return {
    owner: "missing",
    prototypeDepth: null,
  };
}

function describePrototypeChain(value: object) {
  const chain = [];

  let prototype = Object.getPrototypeOf(value);

  let depth = 0;

  while (prototype !== null) {
    const constructor = Object.prototype.hasOwnProperty.call(prototype, "constructor")
      ? Object.getOwnPropertyDescriptor(prototype, "constructor")?.value
      : undefined;

    chain.push({
      depth,
      isObjectPrototype: prototype === Object.prototype,
      properties: describeProperties(prototype),
      ownConstructorType: typeof constructor,
      ownConstructorName: typeof constructor === "function" ? constructor.name : null,
    });

    prototype = Object.getPrototypeOf(prototype);

    depth += 1;
  }

  return chain;
}

function describeConstructor(value: object) {
  const constructor = (
    value as {
      constructor?: unknown;
    }
  ).constructor;

  return {
    ownership: describePropertyOwnership(value, "constructor"),

    type: typeof constructor,

    name: typeof constructor === "function" ? constructor.name : null,

    isObjectConstructor: constructor === Object,
  };
}

function describeObject(value: object, methodNames: readonly string[]) {
  return {
    type: typeof value,

    stringify: String(value as any),

    objectTag: Object.prototype.toString.call(value),

    prototypeIsObjectPrototype: Object.getPrototypeOf(value) === Object.prototype,

    prototypeIsNull: Object.getPrototypeOf(value) === null,

    properties: describeProperties(value),

    prototypeChain: describePrototypeChain(value),

    methodOwnership: Object.fromEntries(
      methodNames.map((name) => [name, describePropertyOwnership(value, name)]),
    ),

    constructorInfo: describeConstructor(value),
  };
}

function cleanupSpreadsheet(globals: Record<string, any>, spreadsheet: any) {
  try {
    globals.DriveApp.getFileById(spreadsheet.getId()).setTrashed(true);
  } catch (error) {
    /*
     * Vegas does not expose reachable Drive File objects yet.
     *
     * This exception is ignored only when running the same
     * characterization case against Vegas. Any real GAS
     * cleanup failure must still fail reference acquisition.
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

export function captureReferenceSpreadsheetObjectGraph() {
  const globals = globalThis as unknown as Record<string, any>;

  const spreadsheet = globals.SpreadsheetApp.create("vegas-reference", 10, 10);

  try {
    /*
     * A newly created GAS spreadsheet is probed through
     * getSheetById(0) because that is the currently
     * implemented Vegas acquisition path.
     *
     * If GAS does not use sheet id 0 here, reference
     * acquisition must fail rather than silently broaden
     * the Vegas API surface.
     */
    const sheet = spreadsheet.getSheetById(0);

    if (!sheet) {
      throw new Error("Expected getSheetById(0) to return the initial sheet");
    }

    const range = sheet.getRange("A1:B2");

    const cellRange = range.getCell(1, 1);

    const reopenedSpreadsheet = globals.SpreadsheetApp.openById(spreadsheet.getId());

    const repeatedSheet = spreadsheet.getSheetById(0);

    const reopenedSheet = reopenedSpreadsheet.getSheetById(0);

    const repeatedRange = sheet.getRange("A1:B2");

    const coordinateRange = sheet.getRange(1, 1, 2, 2);

    const repeatedCell = range.getCell(1, 1);

    const directCellRange = sheet.getRange("A1");

    const singleCellRange = sheet.getRange("B2");

    const singleCellFromGetCell = singleCellRange.getCell(1, 1);

    return {
      spreadsheet: describeObject(spreadsheet, ["getId", "getSheetById", "toString"]),

      sheet: describeObject(sheet, ["getRange", "getSheetId", "toString"]),

      range: describeObject(range, ["getCell", "toString"]),

      cellRange: describeObject(cellRange, ["getCell", "toString"]),

      identity: {
        spreadsheetOpenByIdSameObject: spreadsheet === reopenedSpreadsheet,

        sheetRepeatedSameObject: sheet === repeatedSheet,

        reopenedSpreadsheetSheetSameObject: sheet === reopenedSheet,

        rangeRepeatedSameObject: range === repeatedRange,

        rangeEquivalentCoordinatesSameObject: range === coordinateRange,

        cellRepeatedSameObject: cellRange === repeatedCell,

        cellSameAsDirectSheetRange: cellRange === directCellRange,

        singleCellGetCellReturnsReceiver: singleCellRange === singleCellFromGetCell,
      },
    };
  } finally {
    cleanupSpreadsheet(globals, spreadsheet);
  }
}
