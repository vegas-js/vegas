import type {
  RuntimeDataProperties,
  RuntimeDataSnapshot,
  RuntimeDataSpreadsheet,
} from "../shared/gas";
import { diffRuntimeDataSnapshots } from "./runtime-data-diff";
import { InMemoryPropertiesStore } from "./runtime/in-memory-properties-store";
import { InMemorySpreadsheetStore } from "./runtime/in-memory-spreadsheet-store";
import { LocalRuntimeSession } from "./runtime/local-runtime-session";
import { resolvePropertiesNamespace } from "./runtime/properties-namespace";
import type { PropertiesStore } from "./runtime/properties-store";
import type { InvocationScope } from "./runtime/scope";
import type { SpreadsheetStore } from "./runtime/spreadsheet-store";

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
  const previousSpreadsheets = indexSpreadsheets(previous);
  const nextSpreadsheets = indexSpreadsheets(next);
  const changedSpreadsheetIds = diffRuntimeDataSnapshots(previous, next)
    .filter((change) => change.startsWith(SPREADSHEET_CHANGE_PREFIX))
    .map((change) => change.slice(SPREADSHEET_CHANGE_PREFIX.length));

  // Vegas releases changed fixture identities before applying the next snapshot so valid URL
  // transfers and swaps are reconciled against the final fixture set instead of mutation order.
  for (const id of changedSpreadsheetIds) {
    if (previousSpreadsheets.has(id)) {
      reconciled.removeFixtureSpreadsheet(id);
    }
  }

  for (const id of changedSpreadsheetIds) {
    const nextSpreadsheet = nextSpreadsheets.get(id);

    if (nextSpreadsheet !== undefined) {
      reconciled.replaceFixtureSpreadsheet(nextSpreadsheet);
    }
  }

  return reconciled;
}

function requireInMemoryPropertiesStore(store: PropertiesStore): InMemoryPropertiesStore {
  if (!(store instanceof InMemoryPropertiesStore)) {
    throw new TypeError("Local Runtime reconciliation requires an in-memory Properties store.");
  }

  return store;
}

function requireInMemorySpreadsheetStore(store: SpreadsheetStore): InMemorySpreadsheetStore {
  if (!(store instanceof InMemorySpreadsheetStore)) {
    throw new TypeError("Local Runtime reconciliation requires an in-memory Spreadsheet store.");
  }

  return store;
}

// Google does not define local fixture reload semantics. Vegas keeps session-owned stores across
// reloads while reconciling fixture-backed Properties and Spreadsheet stores on clones.
export async function reconcileLocalRuntimeSession(
  current: LocalRuntimeSession,
  scope: InvocationScope,
  previous: RuntimeDataSnapshot,
  next: RuntimeDataSnapshot,
): Promise<LocalRuntimeSession> {
  const propertiesStore = await reconcileLocalPropertiesStore(
    requireInMemoryPropertiesStore(current.stores.propertiesStore),
    scope,
    previous,
    next,
  );
  const spreadsheetStore = reconcileLocalSpreadsheetStore(
    requireInMemorySpreadsheetStore(current.stores.spreadsheetStore),
    previous,
    next,
  );

  return new LocalRuntimeSession({
    stores: {
      ...current.stores,
      propertiesStore,
      spreadsheetStore,
    },
  });
}
