import type { RuntimeDataSnapshot, RuntimeDataSpreadsheet } from "../shared/gas";
import { diffRuntimeDataSnapshots } from "./runtime-data-diff";
import { InMemorySpreadsheetStore } from "./runtime/in-memory-spreadsheet-store";

const SPREADSHEET_CHANGE_PREFIX = "spreadsheet:";

function indexSpreadsheets(
  snapshot: RuntimeDataSnapshot,
): ReadonlyMap<string, RuntimeDataSpreadsheet> {
  return new Map(snapshot.spreadsheets.map(({ value }) => [value.id, value]));
}

export function reconcileLocalSpreadsheetStore(
  current: InMemorySpreadsheetStore,
  previous: RuntimeDataSnapshot,
  next: RuntimeDataSnapshot,
): InMemorySpreadsheetStore {
  const reconciled = current.clone();
  const nextSpreadsheets = indexSpreadsheets(next);

  for (const change of diffRuntimeDataSnapshots(previous, next)) {
    if (!change.startsWith(SPREADSHEET_CHANGE_PREFIX)) {
      continue;
    }

    const id = change.slice(SPREADSHEET_CHANGE_PREFIX.length);
    const nextSpreadsheet = nextSpreadsheets.get(id);

    if (nextSpreadsheet === undefined) {
      reconciled.removeFixtureSpreadsheet(id);
    } else {
      reconciled.replaceFixtureSpreadsheet(nextSpreadsheet);
    }
  }

  return reconciled;
}
