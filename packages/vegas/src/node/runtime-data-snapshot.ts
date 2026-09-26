import type {
  RuntimeDataProperties,
  RuntimeDataSession,
  RuntimeDataSnapshot,
  RuntimeDataSpreadsheet,
} from "../shared/gas";
import { RuntimeDataTarget } from "../shared/gas";

export type RuntimeDataSnapshotInput =
  | {
      readonly source: string;
      readonly target: RuntimeDataTarget.Properties;
      readonly value: RuntimeDataProperties;
    }
  | {
      readonly source: string;
      readonly target: RuntimeDataTarget.Session;
      readonly value: RuntimeDataSession;
    }
  | {
      readonly source: string;
      readonly target: RuntimeDataTarget.Spreadsheet;
      readonly value: RuntimeDataSpreadsheet;
    };

function cloneRuntimeDataValue<T>(value: T): T {
  return structuredClone(value);
}

function assertSpreadsheetSheetsUnique(source: string, spreadsheet: RuntimeDataSpreadsheet): void {
  const sheetIds = new Set<number>();
  const sheetNames = new Set<string>();

  for (const sheet of spreadsheet.sheets) {
    if (sheetIds.has(sheet.id)) {
      throw new Error(
        `Duplicate Spreadsheet runtime data sheet id ${sheet.id} in "${spreadsheet.id}": ${source}`,
      );
    }

    if (sheetNames.has(sheet.name)) {
      throw new Error(
        `Duplicate Spreadsheet runtime data sheet name "${sheet.name}" in "${spreadsheet.id}": ${source}`,
      );
    }

    sheetIds.add(sheet.id);
    sheetNames.add(sheet.name);
  }
}

export function createRuntimeDataSnapshot(
  inputs: readonly RuntimeDataSnapshotInput[],
): RuntimeDataSnapshot {
  let properties: RuntimeDataSnapshot["properties"];
  let session: RuntimeDataSnapshot["session"];
  const spreadsheets: RuntimeDataSnapshot["spreadsheets"][number][] = [];
  const spreadsheetSourcesById = new Map<string, string>();
  const spreadsheetSourcesByUrl = new Map<string, string>();

  for (const input of inputs) {
    switch (input.target) {
      case RuntimeDataTarget.Properties: {
        if (properties !== undefined) {
          throw new Error(
            `Duplicate Properties runtime data: ${properties.source}, ${input.source}`,
          );
        }

        properties = {
          source: input.source,
          value: cloneRuntimeDataValue(input.value),
        };
        break;
      }
      case RuntimeDataTarget.Session: {
        if (session !== undefined) {
          throw new Error(`Duplicate Session runtime data: ${session.source}, ${input.source}`);
        }

        session = {
          source: input.source,
          value: cloneRuntimeDataValue(input.value),
        };
        break;
      }
      case RuntimeDataTarget.Spreadsheet: {
        const spreadsheet = cloneRuntimeDataValue(input.value);
        const existingIdSource = spreadsheetSourcesById.get(spreadsheet.id);

        if (existingIdSource !== undefined) {
          throw new Error(
            `Duplicate Spreadsheet runtime data id "${spreadsheet.id}": ${existingIdSource}, ${input.source}`,
          );
        }

        spreadsheetSourcesById.set(spreadsheet.id, input.source);

        if (spreadsheet.url !== undefined) {
          const existingUrlSource = spreadsheetSourcesByUrl.get(spreadsheet.url);

          if (existingUrlSource !== undefined) {
            throw new Error(
              `Duplicate Spreadsheet runtime data URL "${spreadsheet.url}": ${existingUrlSource}, ${input.source}`,
            );
          }

          spreadsheetSourcesByUrl.set(spreadsheet.url, input.source);
        }

        assertSpreadsheetSheetsUnique(input.source, spreadsheet);
        spreadsheets.push({
          source: input.source,
          value: spreadsheet,
        });
        break;
      }
    }
  }

  return {
    ...(properties === undefined ? {} : { properties }),
    ...(session === undefined ? {} : { session }),
    spreadsheets,
  };
}
