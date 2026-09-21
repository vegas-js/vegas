import type {
  RuntimeDataProperties,
  RuntimeDataSnapshot,
  RuntimeDataSpreadsheet,
} from "../shared/gas";
import { diffRuntimeDataSnapshots } from "./runtime-data-diff";
import { InMemoryPropertiesStore } from "./runtime/in-memory-properties-store";
import { InMemorySpreadsheetStore } from "./runtime/in-memory-spreadsheet-store";
import { resolvePropertiesNamespace } from "./runtime/properties-namespace";
import type { InvocationScope } from "./runtime/scope";

const SPREADSHEET_CHANGE_PREFIX = "spreadsheet:";

async function replacePropertiesFixture(
  store: InMemoryPropertiesStore,
  scope: InvocationScope,
  data: RuntimeDataProperties | undefined,
): Promise<void> {
  const entries = [
    ["script", data?.scriptProperties],
    ["user", data?.userProperties],
    ["document", data?.documentProperties],
  ] as const;

  for (const [kind, properties] of entries) {
    const namespace = resolvePropertiesNamespace(scope, kind);

    if (namespace !== undefined) {
      await store.replaceAll(namespace, properties ?? {});
    }
  }
}

function indexSpreadsheets(
  snapshot: RuntimeDataSnapshot,
): ReadonlyMap<string, RuntimeDataSpreadsheet> {
  return new Map(snapshot.spreadsheets.map(({ value }) => [value.id, value]));
}

export async function reconcileLocalPropertiesStore(
  current: InMemoryPropertiesStore,
  scope: InvocationScope,
  previous: RuntimeDataSnapshot,
  next: RuntimeDataSnapshot,
): Promise<InMemoryPropertiesStore> {
  const reconciled = current.clone();

  if (diffRuntimeDataSnapshots(previous, next).includes("properties")) {
    await replacePropertiesFixture(reconciled, scope, next.properties?.value);
  }

  return reconciled;
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
