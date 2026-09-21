import type {
  RuntimeDataEntry,
  RuntimeDataProperties,
  RuntimeDataSession,
  RuntimeDataSnapshot,
  RuntimeDataSpreadsheet,
  RuntimeDataSpreadsheetCellValue,
  RuntimeDataSpreadsheetSheet,
} from "../shared/gas";

export type RuntimeDataChangeKey = "properties" | "session" | `spreadsheet:${string}`;

function equalOptionalEntry<T>(
  previous: RuntimeDataEntry<T> | undefined,
  next: RuntimeDataEntry<T> | undefined,
  equalValue: (previous: T, next: T) => boolean,
): boolean {
  if (previous === undefined || next === undefined) {
    return previous === next;
  }

  return equalValue(previous.value, next.value);
}

function equalStringRecord(
  previous: Record<string, string> | undefined,
  next: Record<string, string> | undefined,
): boolean {
  if (previous === undefined || next === undefined) {
    return previous === next;
  }

  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);

  if (previousKeys.length !== nextKeys.length) {
    return false;
  }

  return previousKeys.every((key) => Object.hasOwn(next, key) && previous[key] === next[key]);
}

function equalProperties(previous: RuntimeDataProperties, next: RuntimeDataProperties): boolean {
  return (
    equalStringRecord(previous.documentProperties, next.documentProperties) &&
    equalStringRecord(previous.scriptProperties, next.scriptProperties) &&
    equalStringRecord(previous.userProperties, next.userProperties)
  );
}

function equalSession(previous: RuntimeDataSession, next: RuntimeDataSession): boolean {
  return (
    previous.activeUserEmail === next.activeUserEmail &&
    previous.activeUserLocale === next.activeUserLocale &&
    previous.effectiveUserEmail === next.effectiveUserEmail &&
    previous.temporaryActiveUserKey === next.temporaryActiveUserKey
  );
}

function equalSpreadsheetCellValue(
  previous: RuntimeDataSpreadsheetCellValue,
  next: RuntimeDataSpreadsheetCellValue,
): boolean {
  if (previous instanceof Date || next instanceof Date) {
    return (
      previous instanceof Date && next instanceof Date && previous.getTime() === next.getTime()
    );
  }

  return previous === next;
}

function equalSpreadsheetValues(
  previous: RuntimeDataSpreadsheetSheet["values"],
  next: RuntimeDataSpreadsheetSheet["values"],
): boolean {
  if (previous === undefined || next === undefined) {
    return previous === next;
  }

  if (previous.length !== next.length) {
    return false;
  }

  return previous.every((previousRow, rowIndex) => {
    const nextRow = next[rowIndex];

    if (nextRow === undefined || previousRow.length !== nextRow.length) {
      return false;
    }

    return previousRow.every((previousValue, columnIndex) => {
      const nextValue = nextRow[columnIndex];

      return nextValue !== undefined && equalSpreadsheetCellValue(previousValue, nextValue);
    });
  });
}

function equalSpreadsheetSheet(
  previous: RuntimeDataSpreadsheetSheet,
  next: RuntimeDataSpreadsheetSheet,
): boolean {
  return (
    previous.id === next.id &&
    previous.name === next.name &&
    previous.maxRows === next.maxRows &&
    previous.maxColumns === next.maxColumns &&
    equalSpreadsheetValues(previous.values, next.values)
  );
}

function equalSpreadsheet(previous: RuntimeDataSpreadsheet, next: RuntimeDataSpreadsheet): boolean {
  if (
    previous.id !== next.id ||
    previous.url !== next.url ||
    previous.name !== next.name ||
    previous.sheets.length !== next.sheets.length
  ) {
    return false;
  }

  return previous.sheets.every((previousSheet, index) => {
    const nextSheet = next.sheets[index];

    return nextSheet !== undefined && equalSpreadsheetSheet(previousSheet, nextSheet);
  });
}

function indexSpreadsheets(
  entries: readonly RuntimeDataEntry<RuntimeDataSpreadsheet>[],
): ReadonlyMap<string, RuntimeDataSpreadsheet> {
  return new Map(entries.map(({ value }) => [value.id, value]));
}

export function diffRuntimeDataSnapshots(
  previous: RuntimeDataSnapshot,
  next: RuntimeDataSnapshot,
): readonly RuntimeDataChangeKey[] {
  const changes: RuntimeDataChangeKey[] = [];

  if (!equalOptionalEntry(previous.properties, next.properties, equalProperties)) {
    changes.push("properties");
  }

  if (!equalOptionalEntry(previous.session, next.session, equalSession)) {
    changes.push("session");
  }

  const previousSpreadsheets = indexSpreadsheets(previous.spreadsheets);
  const nextSpreadsheets = indexSpreadsheets(next.spreadsheets);
  const spreadsheetIds = new Set([...previousSpreadsheets.keys(), ...nextSpreadsheets.keys()]);

  for (const id of [...spreadsheetIds].sort()) {
    const previousSpreadsheet = previousSpreadsheets.get(id);
    const nextSpreadsheet = nextSpreadsheets.get(id);

    if (
      previousSpreadsheet === undefined ||
      nextSpreadsheet === undefined ||
      !equalSpreadsheet(previousSpreadsheet, nextSpreadsheet)
    ) {
      changes.push(`spreadsheet:${id}`);
    }
  }

  return changes;
}
